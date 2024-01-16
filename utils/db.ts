import mongoose from "mongoose";
import Recipe from "../types/client/Recipe";
import RecipeModel from "../models/RecipeModel";

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
 * @param {Recipe} recipe the recipe to save
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
 * @param {number} id the recipe ID
 * @returns {Recipe | null} the recipe, or `null` if it couldn't be found
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
