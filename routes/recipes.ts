import axios, { AxiosError } from "axios";
import express from "express";
import { Recipe } from "../models/client/Recipe";
import { SearchResponse } from "../models/spoonacular/SearchResponse";
import { recipeBuilder } from "../utils/recipeBuilder";

const router = express.Router();

// Get a random, low-effort recipe
router.get("/random", async (req, res) => {
  const url = recipeBuilder();

  try {
    const recipeResponse = await axios.get<SearchResponse>(url);
    const recipes = recipeResponse.data;
    const recipe = recipes.results[0];

    // Log the quota used and remaining for developer reference
    // Response headers are in lowercase
    const requestQuota = Number(recipeResponse.headers["x-api-quota-request"]);
    const totalQuota = Number(recipeResponse.headers["x-api-quota-used"]);
    const remainingQuota = Number(recipeResponse.headers["x-api-quota-left"]);
    console.log(`GET /random -${requestQuota} pts`);
    console.log(
      `${remainingQuota} / ${totalQuota + remainingQuota} pts remaining`
    );

    // Map the server-side response to the client-side schema
    const { nutrients, ingredients } = recipe.nutrition;
    const calories = nutrients.find((nutrient) => nutrient.name === "Calories");
    const fats = nutrients.find((nutrient) => nutrient.name === "Fat");
    const saturatedFats = nutrients.find(
      (nutrient) => nutrient.name === "Saturated Fat"
    );
    const carbs = nutrients.find(
      (nutrient) => nutrient.name === "Carbohydrates"
    );
    const fiber = nutrients.find((nutrient) => nutrient.name === "Fiber");
    const sugars = nutrients.find((nutrient) => nutrient.name === "Sugar");
    const protein = nutrients.find((nutrient) => nutrient.name === "Protein");
    const cholesterol = nutrients.find(
      (nutrient) => nutrient.name === "Cholesterol"
    );
    const sodium = nutrients.find((nutrient) => nutrient.name === "Sodium");

    const resJson: Recipe = {
      id: recipe.id,
      name: recipe.title,
      url: recipe.spoonacularSourceUrl,
      image: recipe.image,
      healthScore: recipe.healthScore,
      time: recipe.readyInMinutes,
      servings: recipe.servings,
      summary: recipe.summary,
      nutrients: {
        calories: {
          amount: calories?.amount,
          unit: calories?.unit,
        },
        fats: {
          amount: fats?.amount,
          unit: fats?.unit,
        },
        saturatedFats: {
          amount: saturatedFats?.amount,
          unit: saturatedFats?.unit,
        },
        carbs: {
          amount: carbs?.amount,
          unit: carbs?.unit,
        },
        fiber: {
          amount: fiber?.amount,
          unit: fiber?.unit,
        },
        sugars: {
          amount: sugars?.amount,
          unit: sugars?.unit,
        },
        protein: {
          amount: protein?.amount,
          unit: protein?.unit,
        },
        cholesterol: {
          amount: cholesterol?.amount,
          unit: cholesterol?.unit,
        },
        sodium: {
          amount: sodium?.amount,
          unit: sodium?.unit,
        },
      },
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
    return res.json(resJson);
  } catch (err) {
    const error = err as AxiosError;
    const errorMessage = `${error.name} (${error.code ?? "Error"}): ${
      error.message
    }`;
    console.error(errorMessage);
    return res.status(500).json({ error: errorMessage });
  }
});

export default router;
