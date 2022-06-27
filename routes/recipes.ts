import axios, { AxiosError } from "axios";
import express from "express";
import { Recipes } from "../models/Recipes";
import { getRandomElement } from "../utils/array";
import { recipeBuilder } from "../utils/recipeBuilder";

const router = express.Router();

// Get a random, low-effort recipe
router.get("/random", async (req, res) => {
  const url = recipeBuilder();

  try {
    // Get a list of 20 random recipes, then randomly select one of the recipes
    const recipeResponse = await axios.get<Recipes>(url);
    const recipes = recipeResponse.data;
    const recipe = getRandomElement(recipes.hits).recipe;
    return res.json(recipe);
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
