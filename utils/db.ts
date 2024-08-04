import mongoose from "mongoose";

import Recipe from "../types/client/Recipe";
import RecipeModel from "../models/RecipeModel";
import RecipeFilter from "../types/client/RecipeFilter";
import { isEmptyObject } from "./object";

// MongoDB indexes
export const Indexes = {
  RecipeName: "recipe-name",
} as const;

export const MAX_DOCS = 100;

/**
 * Connect to MongoDB using mongoose
 */
export const connectToMongoDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}`);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1); // exit with failure
  }
};

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

    return doc._id;
  } catch (error) {
    console.error(`Failed to save recipe ${recipe.name}:`, error);
    return undefined;
  }
};

/**
 * Check if a recipe with an ID exists in MongoDB
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
    spiceLevels,
    types,
    cultures,
    token,
  }: Partial<RecipeFilter>,
  isFindQuery = false
): mongoose.FilterQuery<Recipe> => {
  // Create a find/match query for MongoDB
  const query: mongoose.FilterQuery<Recipe> = {};

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
    // Append the condition if minCals is defined as well
    if (Object.hasOwn(query, "nutrients")) {
      query.nutrients.$elemMatch.amount.$lte = maxCals;
    } else {
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
  if (spiceLevels !== undefined) {
    query.spiceLevel = { $in: spiceLevels };
  }
  if (types !== undefined) {
    query.types = { $in: types };
  }
  if (cultures !== undefined) {
    query.culture = { $in: cultures };
  }

  if (isFindQuery && token !== undefined) {
    query._id = {
      $gt: new mongoose.Types.ObjectId(token),
    };
  }

  return query;
};

const recipeFindQuery = async (
  filter: Partial<RecipeFilter>
): Promise<Recipe[] | null> => {
  const findQuery = createQuery(filter, true);
  console.log("MongoDB find query:", JSON.stringify(findQuery));

  try {
    return await RecipeModel.find(findQuery).limit(MAX_DOCS).exec();
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
    searchAfter: filter.token,
  });

  if (!isEmptyObject(matchQuery)) {
    pipeline = pipeline.match(matchQuery);
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
  if (filter.query !== undefined) {
    // If a full-text search is required, use an aggregation pipeline
    return await recipeAggregateQuery(filter);
  } else {
    // Otherwise, use a simple find query
    return await recipeFindQuery(filter);
  }
};
