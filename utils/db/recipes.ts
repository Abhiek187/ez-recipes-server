import { QueryFilter, SortValues, Types } from "mongoose";

import { MAX_DOCS, Indexes } from ".";
import RecipeModel from "../../models/RecipeModel";
import Recipe from "../../types/client/Recipe";
import RecipeFilter, {
  RECIPE_SORT_MAP,
  RecipeSortField,
} from "../../types/client/RecipeFilter";
import { isEmptyObject } from "../object";
import RecipePatch from "../../types/client/RecipePatch";
import { isNumeric } from "../string";

/**
 * Write a recipe to MongoDB
 * @param recipe the recipe to save
 * @returns the ObjectId of the recipe document, or `undefined` if the recipe couldn't be saved
 */
export const saveRecipe = async (
  recipe: Omit<Recipe, "_id">
): Promise<string | undefined> => {
  try {
    const query = { id: recipe.id };
    // If the recipe exists, update it with what spoonacular returns, otherwise insert a new document
    const doc = await RecipeModel.findOneAndUpdate(query, recipe, {
      new: true, // return the document after the update
      upsert: true,
    }).exec();

    return doc._id.toString();
  } catch (error) {
    console.error(`Failed to save recipe ${recipe.name}:`, error);
    return undefined;
  }
};

/**
 * Fetch a single recipe from MongoDB, if it exists
 * @param id the recipe ID
 * @returns the recipe, or `null` if it couldn't be found
 */
export const fetchRecipe = async (id: number): Promise<Recipe | null> => {
  try {
    // Response will contain the _id and __v fields
    return await RecipeModel.findOne({ id }).exec();
  } catch (error) {
    console.error(`Failed to fetch recipe with ID ${id}:`, error);
    return null;
  }
};

/**
 * Check if a recipe with ID exists in MongoDB
 * @param id the recipe ID
 * @returns `true` if the recipe could be found, `false` otherwise
 */
export const recipeExists = async (id: number): Promise<boolean> => {
  try {
    const count = await RecipeModel.countDocuments({ id }).exec();
    return count > 0;
  } catch (error) {
    console.error("Failed to count recipes:", error);
    return false;
  }
};

const createQuery = (
  {
    minCals,
    maxCals,
    vegetarian,
    vegan,
    glutenFree,
    healthy,
    cheap,
    sustainable,
    rating,
    spiceLevels,
    types,
    cultures,
    token,
    sort,
    asc,
  }: Partial<RecipeFilter>,
  isFindQuery = false
): QueryFilter<Recipe> => {
  // Create a find/match query for MongoDB
  const query: QueryFilter<Recipe> = {};

  if (minCals !== undefined && maxCals !== undefined) {
    query.nutrients = {
      $elemMatch: {
        name: "Calories",
        amount: {
          $gte: minCals,
          $lte: maxCals,
        },
      },
    };
  } else {
    if (minCals !== undefined) {
      query.nutrients = {
        $elemMatch: {
          name: "Calories",
          amount: {
            $gte: minCals,
          },
        },
      };
    }
    if (maxCals !== undefined) {
      query.nutrients = {
        $elemMatch: {
          name: "Calories",
          amount: {
            $lte: maxCals,
          },
        },
      };
    }
  }
  if (vegetarian !== undefined) {
    query.isVegetarian = vegetarian;
  }
  if (vegan !== undefined) {
    query.isVegan = vegan;
  }
  if (glutenFree !== undefined) {
    query.isGlutenFree = glutenFree;
  }
  if (healthy !== undefined) {
    query.isHealthy = healthy;
  }
  if (cheap !== undefined) {
    query.isCheap = cheap;
  }
  if (sustainable !== undefined) {
    query.isSustainable = sustainable;
  }
  if (rating !== undefined) {
    query.averageRating = { $gte: rating };
  }
  if (spiceLevels !== undefined) {
    query.spiceLevel = { $in: spiceLevels };
  }
  if (types !== undefined) {
    query.types = { $in: types };
  }
  if (cultures !== undefined) {
    query.culture = { $in: cultures };
  }

  if (token !== undefined) {
    if (sort !== undefined && (isFindQuery || sort === "calories")) {
      // Token is compound
      const [sortField, lastValueStr, objectId] = token.split(":");
      let lastValue: number | null = null;

      if (isNumeric(lastValueStr)) {
        lastValue = Number(lastValueStr);
      }

      query.$or = [
        { [sortField]: asc === true ? { $gt: lastValue } : { $lt: lastValue } },
        { [sortField]: lastValue, _id: { $gt: new Types.ObjectId(objectId) } },
      ];

      // If null & ascending, change $gt to 0. If descending, remove the first query.
      if (lastValue === null) {
        if (asc === true) {
          query.$or[0][sortField]["$gt"] = 0;
        } else {
          query.$or = query.$or.slice(1);
        }
      }
    } else if (isFindQuery) {
      // Token is ObjectId
      query._id = {
        $gt: new Types.ObjectId(token),
      };
    }
  }

  return query;
};

const createSortQuery = (
  sort?: RecipeSortField,
  asc?: boolean,
  isFindQuery = false
): Record<string, SortValues | { $meta: string }> => {
  const sortValue: SortValues = asc === true ? 1 : -1;
  // Guarantees stable results since _id is always unique
  const id: Record<string, SortValues> = { _id: 1 };
  const searchScore: Record<string, SortValues | { $meta: string }> =
    sort === "calories" ? { score: -1 } : { score: { $meta: "searchScore" } };

  if (sort === undefined) {
    return isFindQuery
      ? id
      : {
          ...searchScore,
          ...id,
        };
  } else {
    return isFindQuery
      ? { [RECIPE_SORT_MAP[sort]]: sortValue, ...id }
      : {
          [RECIPE_SORT_MAP[sort]]: sortValue,
          ...searchScore,
          ...id,
        };
  }
};

const recipeFindQuery = async (
  filter: Partial<RecipeFilter>
): Promise<Recipe[] | null> => {
  const findQuery = createQuery(filter, true);
  console.log("MongoDB find query:", JSON.stringify(findQuery));
  const sortQuery = createSortQuery(filter.sort, filter.asc, true);
  console.log("MongoDB sort query:", JSON.stringify(sortQuery));

  try {
    return await RecipeModel.find(findQuery)
      .sort(sortQuery)
      .limit(MAX_DOCS)
      .lean()
      .exec();
  } catch (error) {
    console.error("Failed to filter recipes:", error);
    return null;
  }
};

const recipeAggregateQuery = async (
  // Query key is required, everything else is optional
  filter: Partial<RecipeFilter>
): Promise<Recipe[] | string | null> => {
  const matchQuery = createQuery(filter);
  console.log("MongoDB match query:", JSON.stringify(matchQuery));
  const sortQuery = createSortQuery(filter.sort, filter.asc);
  console.log("MongoDB sort query:", JSON.stringify(sortQuery));
  const sortByCalories = filter.sort === "calories";

  /*
   * Search must be the first stage in the pipeline before $match.
   * If performance becomes an issue, try following this guide:
   * https://www.mongodb.com/docs/atlas/atlas-search/performance/query-performance/#-match-aggregation-stage-usage
   */
  let pipeline = RecipeModel.aggregate().search({
    index: Indexes.RecipeName,
    text: {
      query: filter.query,
      path: {
        wildcard: "*",
      },
    },
    // $search.sort doesn't support positional arguments, need to add a separate $sort stage
    searchAfter: sortByCalories ? undefined : filter.token,
    sort: sortByCalories ? undefined : sortQuery,
  });

  if (!isEmptyObject(matchQuery as Record<string, unknown>)) {
    pipeline = pipeline.match(
      matchQuery as QueryFilter<Record<string, unknown>>
    );
  }

  if (sortByCalories) {
    // searchScore can't be sorted in the $sort stage without projecting it first
    pipeline = pipeline
      .addFields({
        score: { $meta: "searchScore" },
      })
      .sort(sortQuery as Record<string, SortValues>)
      .project({
        score: 0,
      });
  }

  try {
    return await pipeline
      .limit(MAX_DOCS)
      .addFields({
        token: {
          $meta: "searchSequenceToken",
        },
      })
      .exec();
  } catch (error) {
    console.error("Failed to search recipes:", error);

    /* I'm not sure what's considered a valid search token beyond being base64,
     * so return a 400 error if this specific error occurs.
     */
    if ((error as Error).message.includes("searchAfter")) {
      return `Token "${filter.token}" is not a valid searchSequenceToken`;
    }

    return null;
  }
};

/**
 * Query recipes by the provided filters
 * @param filter an object describing how to filter the recipes
 * @returns a list of recipes, a `string` if a known error occurred,
 * or `null` if an unknown error occurred
 */
export const filterRecipes = async (
  filter: Partial<RecipeFilter>
): Promise<Recipe[] | string | null> => {
  let recipes: Recipe[] | string | null = null;

  if (filter.query !== undefined) {
    // If a full-text search is required, use an aggregation pipeline
    recipes = await recipeAggregateQuery(filter);
  } else {
    // Otherwise, use a simple find query
    recipes = await recipeFindQuery(filter);
  }

  if (
    Array.isArray(recipes) &&
    recipes.length > 0 &&
    filter.sort !== undefined &&
    (filter.query === undefined || filter.sort === "calories")
  ) {
    // Append a compound token to the last recipe
    const lastRecipe = recipes[recipes.length - 1];
    const sortField = RECIPE_SORT_MAP[filter.sort];
    const objectId = lastRecipe._id;
    let lastValue = "";

    switch (filter.sort) {
      case "calories":
        lastValue = lastRecipe.nutrients[0].amount.toString();
        break;
      case "health-score":
        lastValue = lastRecipe.healthScore.toString();
        break;
      case "rating":
        lastValue = lastRecipe.averageRating?.toString() ?? "null";
        break;
      case "views":
        lastValue = lastRecipe.views?.toString() ?? "null";
    }

    recipes[recipes.length - 1] = {
      ...lastRecipe,
      token: [sortField, lastValue, objectId].join(":"),
    };
  }

  return recipes;
};

/**
 * Update statistical information about a recipe.
 * If the chef isn't authenticated, a limited set of updates are made.
 * @param id the ID of the recipe to update
 * @param body information to update in the recipe
 * @param isAuthenticated whether the chef is authenticated
 * @param oldRating the chef's original rating for the recipe if they updated it
 * @returns an error if the recipe couldn't be updated
 */
export const updateRecipeStats = async (
  id: number,
  body: RecipePatch,
  isAuthenticated: boolean,
  oldRating?: number
): Promise<{ code: number; message: string } | undefined> => {
  const { rating, view } = body;

  try {
    const doc = await RecipeModel.findOne({ id }).exec();
    if (doc === null) {
      const message = `Recipe with ID ${id} not found`;
      console.error(message);
      return { code: 404, message };
    }

    if (rating !== undefined && isAuthenticated) {
      const currentAverage = doc.averageRating;
      const currentTotal = doc.totalRatings ?? 0;

      if (
        oldRating !== undefined &&
        currentAverage !== null &&
        currentAverage !== undefined &&
        currentTotal > 0
      ) {
        // totalRatings stays the same
        doc.averageRating =
          currentAverage + (rating - oldRating) / currentTotal;
      } else {
        const newTotal = currentTotal + 1;
        const newAverage =
          currentAverage === null || currentAverage === undefined
            ? rating
            : (currentAverage * currentTotal + rating) / newTotal;

        // Store the exact average in the DB & round it in the UI
        doc.averageRating = newAverage;
        doc.totalRatings = newTotal;
      }
    }
    // View counts can be updated anonymously
    if (view === true) {
      doc.views = (doc.views ?? 0) + 1;
    }

    await doc.save(); // save fails if the schema is invalid
  } catch (error) {
    const message = "Failed to update the recipe's stats";
    console.error(`${message}:`, error);
    return { code: 500, message };
  }
};
