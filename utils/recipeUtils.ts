// Helper methods for the recipes route
import { AxiosError, AxiosResponse } from "axios";

import Recipe from "../types/client/Recipe";
import RecipeResponse from "../types/spoonacular/RecipeResponse";
import SearchResponse from "../types/spoonacular/SearchResponse";
import { isObject } from "./object";
import ErrorResponse from "../types/spoonacular/ErrorResponse";
import api, { handleAxiosError } from "./api";
import TasteResponse from "../types/spoonacular/TasteResponse";

/**
 * Build the spoonacular URL to fetch a random, low-effort recipe
 * 
 * Low-effort filter recipes:
 * - Uses 5 or fewer ingredients
 * - Only uses common ingredients like chicken, potatoes, onions, and carrots. We want these recipes to
 *  be dishes people can put together with ingredients lying around the kitchen
 * - 1 hour or less of cook time
 * - Can make 3 or more servings

 * @returns {string} the encoded URI
 */
export const randomRecipeUrlBuilder = (): string => {
  const url =
    "/complexSearch?instructionsRequired=true&addRecipeNutrition=true&maxReadyTime=60&sort=random&number=1";
  return encodeURI(url);
};

/**
 * Build the spoonacular URL to fetch a recipe by ID
 * @param {string} id the recipe ID
 * @returns {string} the encoded URI
 */
export const recipeIdUrlBuilder = (id: string): string => {
  const url = `/${id}/information?includeNutrition=true`;
  return encodeURI(url);
};

/**
 * Build the spoonacular URL to fetch a recipe's taste
 * @param {string} id the recipe ID
 * @returns {string} the encoded URI
 */
export const tasteUrlBuilder = (id: number): string => {
  const url = `/${id}/tasteWidget.json`;
  return encodeURI(url);
};

/**
 * Log the quota used and remaining for developer reference
 * @param {string} method the request method
 * @param {string} path the path of the API
 * @param {AxiosResponse<any>} recipeResponse the response gotten from the recipe API
 */
export const logSpoonacularQuota = (
  method: string,
  path: string,
  recipeResponse: AxiosResponse<any>
) => {
  // Response headers are in lowercase
  const requestQuota = Number(recipeResponse.headers["x-api-quota-request"]);
  const usedQuota = Number(recipeResponse.headers["x-api-quota-used"]);
  const remainingQuota = Number(recipeResponse.headers["x-api-quota-left"]);

  console.log(`${method} ${path} -${requestQuota} pts`);
  console.log(
    `${remainingQuota} / ${usedQuota + remainingQuota} pts remaining`
  );
};

/**
 * Get the spice level of a recipe
 * @param {number} recipeId the recipe ID
 * @returns {string} a spice level
 */
export const getSpiceLevel = async (
  recipeId: number
): Promise<Recipe["spiceLevel"]> => {
  const url = tasteUrlBuilder(recipeId);

  try {
    const tasteResponse = await api.get<TasteResponse>(url);
    logSpoonacularQuota("GET", url, tasteResponse);

    const spiceValue = tasteResponse.data.spiciness;

    // Spices are weighted by their Scoville amount
    if (spiceValue < 100_000) {
      return "none";
    } else if (spiceValue < 1_000_000) {
      return "mild";
    } else {
      return "spicy";
    }
  } catch (error) {
    handleAxiosError(error as AxiosError);
    return "unknown";
  }
};

/**
 * Map the server-side response to the client-side schema
 * @param {SearchResponse | RecipeResponse} recipes the response data from either the random recipe
 * API or the recipe ID API
 * @returns {Promise<Recipe>} a recipe object to be consumed by clients
 */
export const createClientResponse = async (
  recipes: SearchResponse | RecipeResponse
): Promise<Recipe> => {
  let recipe: RecipeResponse;

  if (recipes.hasOwnProperty("results")) {
    recipe = (recipes as SearchResponse).results[0];
  } else {
    recipe = recipes as RecipeResponse;
  }

  const { nutrients, ingredients } = recipe.nutrition;
  // A list of all the nutrients to display in the client apps
  const nutrientNames = [
    "Calories",
    "Fat",
    "Saturated Fat",
    "Carbohydrates",
    "Fiber",
    "Sugar",
    "Protein",
    "Cholesterol",
    "Sodium",
  ];

  const filteredNutrients: {
    name: string;
    amount: number;
    unit: string;
  }[] = [];

  // Look for each nutrient in nutrientNames and add them to the client-side nutrients property
  for (const nutrientName of nutrientNames) {
    const nutrient = nutrients.find(
      (nutrient) => nutrient.name === nutrientName
    );

    if (nutrient !== undefined) {
      filteredNutrients.push({
        name: nutrient.name,
        amount: nutrient.amount,
        unit: nutrient.unit,
      });
    }
  }

  const resJson: Recipe = {
    id: recipe.id,
    name: recipe.title,
    url: recipe.spoonacularSourceUrl,
    image: recipe.image,
    credit: recipe.creditsText,
    sourceUrl: recipe.sourceUrl,
    healthScore: recipe.healthScore,
    time: recipe.readyInMinutes,
    servings: recipe.servings,
    summary: recipe.summary,
    types: recipe.dishTypes,
    spiceLevel: await getSpiceLevel(recipe.id),
    isVegetarian: recipe.vegetarian,
    isVegan: recipe.vegan,
    isGlutenFree: recipe.glutenFree,
    isHealthy: recipe.veryHealthy,
    isCheap: recipe.cheap,
    isSustainable: recipe.sustainable,
    culture: recipe.cuisines,
    nutrients: filteredNutrients,
    // Ignore the nutrients information for each ingredient
    ingredients: ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
    })),
    instructions: recipe.analyzedInstructions.map((instruction) => ({
      name: instruction.name,
      steps: instruction.steps.map((step) => ({
        number: step.number,
        step: step.step,
        ingredients: step.ingredients.map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
          image: ingredient.image,
        })),
        equipment: step.equipment.map((equip) => ({
          id: equip.id,
          name: equip.name,
          image: equip.image,
        })),
      })),
    })),
  };

  return resJson;
};

// Private function to check for all the properties of an object
const typeCheck = (data: any, props: string[]): boolean => {
  // Assert that data is an object
  if (!isObject(data)) {
    return false;
  }

  for (const prop of props) {
    if (!data.hasOwnProperty(prop)) {
      console.log(`This object doesn't have a ${prop} property.`);
      return false;
    }
  }

  return true;
};

// Type guard to check if a response contains all the error properties found in spoonacular
export const isErrorResponse = (data: any): data is ErrorResponse => {
  return typeCheck(data, ["code", "message", "status"]);
};

export const isSearchResponse = (data: any): data is SearchResponse => {
  // Check that the data contains all the properties defined for SearchResponse
  return typeCheck(data, ["results", "offset", "number", "totalResults"]);
};

export const isRecipeResponse = (data: any): data is RecipeResponse => {
  // Check that the data contains all the properties defined for RecipeResponse
  return typeCheck(data, [
    "vegetarian",
    "vegan",
    "glutenFree",
    "dairyFree",
    "veryHealthy",
    "cheap",
    "veryPopular",
    "sustainable",
    "lowFodmap",
    "weightWatcherSmartPoints",
    "gaps",
    "preparationMinutes",
    "cookingMinutes",
    "aggregateLikes",
    "healthScore",
    "creditsText",
    "sourceName",
    "pricePerServing",
    "id",
    "title",
    "readyInMinutes",
    "servings",
    "sourceUrl",
    "image",
    "imageType",
    "nutrition",
    "summary",
    "cuisines",
    "dishTypes",
    "diets",
    "occasions",
    "analyzedInstructions",
    "spoonacularSourceUrl",
  ]);
};
