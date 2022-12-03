// Helper methods for the recipes route
import { AxiosResponse } from "axios";
import Recipe from "../types/client/Recipe";
import RecipeResponse from "../types/spoonacular/RecipeResponse";
import SearchResponse from "../types/spoonacular/SearchResponse";
import RecipeHeaders from "../types/spoonacular/RecipeHeaders";

/**
 * Build the spoonacular URL to fetch a random, low-effort recipe
 * 
 * Low-effort filter recipes:
 * - Uses 5 or fewer ingredients
 * - Only uses common ingredients like chicken, potatoes, onions, and carrots. We want these recipes to
 *  be dishes people can put together with ingredients lying around the kitchen
 * - 1 hour or less of cook time
 * - Can make 3 or more servings

 * @returns {[string, RecipeHeaders]} an encoded URI and headers
 */
export const randomRecipeUrlBuilder = (): [string, RecipeHeaders] => {
  const apiKey = process.env.API_KEY;
  let url = `https://api.spoonacular.com/recipes/complexSearch?instructionsRequired=true&addRecipeNutrition=true&maxReadyTime=60&sort=random&number=1`;
  // It's more secure to pass the API key as a header than as a query parameter
  const headers: RecipeHeaders = {
    "x-api-key": apiKey ?? "",
  };

  return [encodeURI(url), headers];
};

/**
 * Build the spoonacular URL to fetch a recipe by ID
 * @param {number} id the recipe ID
 * @returns {[string, RecipeHeaders]} an encoded URI and headers
 */
export const recipeIdUrlBuilder = (id: number): [string, RecipeHeaders] => {
  const apiKey = process.env.API_KEY;
  const url = `https://api.spoonacular.com/recipes/${id}/information?includeNutrition=true`;
  const headers: RecipeHeaders = {
    "x-api-key": apiKey ?? "",
  };

  return [encodeURI(url), headers];
};

/**
 * Log the quota used and remaining for developer reference
 * @param {string} method the request method
 * @param {string} path the path of the API
 * @param {AxiosResponse<SearchResponse | RecipeResponse>} recipeResponse the response gotten from the recipe API
 */
export const logSpoonacularQuota = (
  method: string,
  path: string,
  recipeResponse: AxiosResponse<SearchResponse | RecipeResponse>
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
 * Map the server-side response to the client-side schema
 * @param {SearchResponse | RecipeResponse} recipes the response data from either the random recipe
 * API or the recipe ID API
 * @returns {Recipe} a recipe object to be consumed by clients
 */
export const createClientResponse = (
  recipes: SearchResponse | RecipeResponse
): Recipe => {
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
