// Helper methods for the recipes route
import { AxiosError, AxiosResponse } from "axios";

import Recipe from "../types/client/Recipe";
import RecipeResponse from "../types/spoonacular/RecipeResponse";
import SearchResponse from "../types/spoonacular/SearchResponse";
import { isObject } from "./object";
import ErrorResponse from "../types/spoonacular/ErrorResponse";
import api, { handleAxiosError } from "./api";
import TasteResponse from "../types/spoonacular/TasteResponse";
import { isNumeric } from "./string";

/**
 * Check if a query parameter is a valid number
 * @param param the query parameter value
 * @param name the query parameter name
 * @param min the minimum valid value for `param`
 * @param max the maximum valid value for `param`
 * @throws if the query parameter is invalid
 * @returns the query parameter converted to a number
 */
export const sanitizeNumber = (
  param: any,
  name: string,
  min: number,
  max: number
): number => {
  if (typeof param !== "string" || !isNumeric(param)) {
    throw `${name} is not numeric`;
  }

  const paramNum = Number(param);

  if (paramNum < min) {
    throw `${name} must be >= ${min}`;
  } else if (paramNum > max) {
    throw `${name} must be <= ${max}`;
  }

  return paramNum;
};

/**
 * Check if a query parameter is a valid enum `T`
 * @param param the query parameter value
 * @param name the query parameter name
 * @param validator a type guard that checks if the query parameter is of type `T`
 * @throws if the query parameter is invalid
 * @returns the query parameter as type `T`
 */
export const sanitizeEnum = <T extends string>(
  param: string,
  name: string,
  validator: (str: string) => str is T
): T => {
  if (validator(param)) {
    return param;
  } else {
    throw `Unknown ${name} received: ${param}`;
  }
};

/**
 * Check if all the query parameters in the array are valid enums of type `T`
 * @param params the array of query parameters
 * @param name the name of each query parameter
 * @param validator a type guard that checks if each query parameter is of type `T`
 * @throws if one of the query parameters is invalid
 * @returns the query parameters as type `T[]`
 */
export const sanitizeEnumArray = <T extends string>(
  params: any[],
  name: string,
  validator: (str: string) => str is T
): T[] => {
  const enums: T[] = [];

  for (const param of params) {
    if (typeof param === "string") {
      // If sanitizeEnum throws, pass it to the caller
      enums.push(sanitizeEnum(param, name, validator));
    }
  }

  return enums;
};

/**
 * Build the spoonacular URL to fetch a random, low-effort recipe
 * 
 * Low-effort filter recipes:
 * - Uses 5 or fewer ingredients
 * - Only uses common ingredients like chicken, potatoes, onions, and carrots. We want these recipes to
 *  be dishes people can put together with ingredients lying around the kitchen
 * - 1 hour or less of cook time
 * - Can make 3 or more servings

 * @returns the encoded URI
 */
export const randomRecipeUrlBuilder = (): string => {
  const url =
    "/complexSearch?instructionsRequired=true&addRecipeNutrition=true&maxReadyTime=60&sort=random&number=1";
  return encodeURI(url);
};

/**
 * Build the spoonacular URL to fetch a recipe by ID
 * @param id the recipe ID
 * @returns the encoded URI
 */
export const recipeIdUrlBuilder = (id: string): string => {
  // Need to explicitly set query params to save on points
  // addTasteData will save 0.5 points and an additional API call
  const url = `/${id}/information?includeNutrition=true&addWinePairing=false&addTasteData=true`;
  return encodeURI(url);
};

/**
 * Build the spoonacular URL to fetch a recipe's taste
 * @param id the recipe ID
 * @returns the encoded URI
 */
export const tasteUrlBuilder = (id: number): string => {
  const url = `/${id}/tasteWidget.json`;
  return encodeURI(url);
};

/**
 * Log the quota used and remaining for developer reference
 * @param method the request method
 * @param path the path of the API
 * @param recipeResponse the response gotten from the recipe API
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
 * @param recipeId the recipe ID
 * @returns a spice level
 */
export const getSpiceLevel = async (
  recipeId: number
): Promise<Recipe["spiceLevel"]> => {
  const url = tasteUrlBuilder(recipeId);

  try {
    const tasteResponse = await api.get<TasteResponse>(url);
    logSpoonacularQuota("GET", url, tasteResponse);

    const spiceValue = tasteResponse.data.spiciness;
    return spiceToString(spiceValue);
  } catch (error) {
    handleAxiosError(error as AxiosError);
    return "unknown";
  }
};

const spiceToString = (spiceValue: number): Recipe["spiceLevel"] => {
  // Spices are weighted by their Scoville amount
  if (spiceValue < 100_000) {
    return "none";
  } else if (spiceValue < 1_000_000) {
    return "mild";
  } else {
    return "spicy";
  }
};

/**
 * Map the server-side response to the client-side schema
 * @param recipes the response data from either the random recipe
 * API or the recipe ID API
 * @returns a recipe object to be consumed by clients
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
    spiceLevel:
      recipe.taste !== undefined
        ? spiceToString(recipe.taste.spiciness)
        : await getSpiceLevel(recipe.id),
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
          image: stripURL(ingredient.image),
        })),
        equipment: step.equipment.map((equip) => ({
          id: equip.id,
          name: equip.name,
          image: stripURL(equip.image),
        })),
      })),
    })),
  };

  return resJson;
};

// Remove the full spoonacular URL from image URLs for backwards compatibility
// See: https://github.com/Abhiek187/ez-recipes-server/issues/189
const stripURL = (image: string): string => {
  try {
    const imageUrl = new URL(image);
    return imageUrl.pathname.split("/").at(-1) ?? image;
  } catch (error) {
    // Invalid URL
    return image;
  }
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
