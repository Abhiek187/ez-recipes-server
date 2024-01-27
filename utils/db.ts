import mongoose from "mongoose";

import Recipe from "../types/client/Recipe";
import RecipeModel from "../models/RecipeModel";
import RecipeFilter from "../types/client/RecipeFilter";

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
 */
export const saveRecipe = async (recipe: Recipe) => {
  try {
    const query = { id: recipe.id };
    // If the recipe exists, update it with what spoonacular returns, otherwise insert a new document
    // Returns the document if it exists, or null if it doesn't exist
    await RecipeModel.findOneAndUpdate(query, recipe, {
      upsert: true,
    }).exec();
  } catch (error) {
    console.error(`Failed to save recipe ${recipe.name}:`, error);
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

/**
 * Query recipes by the provided filters
 * @param filter an object describing how to filter the recipes
 * @returns a list of recipes, or `null` if an error occurred
 */
export const filterRecipes = async ({
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
}: Partial<RecipeFilter>): Promise<Recipe[] | null> => {
  let query: mongoose.FilterQuery<Recipe> = {};

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

  try {
    console.log("MongoDB query:", JSON.stringify(query));
    return await RecipeModel.find(query).exec();
  } catch (error) {
    console.error("Failed to filter recipes:", error);
    return null;
  }
};

export const searchRecipes = async (
  query: string
): Promise<Recipe[] | null> => {
  try {
    return await RecipeModel.aggregate()
      .search({
        index: "recipe-name",
        text: {
          query,
          path: {
            wildcard: "*",
          },
        },
      })
      .exec();
  } catch (error) {
    console.error("Failed to search recipes:", error);
    return null;
  }
};
