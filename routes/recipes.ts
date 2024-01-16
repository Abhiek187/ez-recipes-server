import { AxiosError } from "axios";
import express from "express";

import RecipeResponse from "../types/spoonacular/RecipeResponse";
import SearchResponse from "../types/spoonacular/SearchResponse";
import {
  createClientResponse,
  logSpoonacularQuota,
  randomRecipeUrlBuilder,
  recipeIdUrlBuilder,
} from "../utils/recipeUtils";
import { isNumeric } from "../utils/string";
import api, { handleAxiosError } from "../utils/api";
import { fetchRecipe, saveRecipe } from "../utils/db";

const router = express.Router();

// Get a random, low-effort recipe
router.get("/random", async (req, res) => {
  const url = randomRecipeUrlBuilder();

  try {
    const recipeResponse = await api.get<SearchResponse>(url);
    logSpoonacularQuota(req.method, req.originalUrl, recipeResponse);

    const recipes = recipeResponse.data;
    const resJson = await createClientResponse(recipes);
    await saveRecipe(resJson); // cache in MongoDB

    res.json(resJson);
  } catch (err) {
    const error = err as AxiosError;
    const [status, json] = handleAxiosError(error);
    res.status(status).json(json);
  }
});

// Get a recipe by its ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  // Check that ID in the URL is numeric to prevent SSRF (server-side request forgery) attacks
  if (!isNumeric(id)) {
    return res.status(400).json({ error: "The recipe ID must be numeric" });
  }

  // If the recipe exists in MongoDB, return that to save an API call to spoonacular
  const existingRecipe = await fetchRecipe(Number(id));

  if (existingRecipe !== null) {
    res.json(existingRecipe);
    return;
  }

  const url = recipeIdUrlBuilder(id);

  try {
    const recipeResponse = await api.get<RecipeResponse>(url);
    logSpoonacularQuota(req.method, req.originalUrl, recipeResponse);

    const recipes = recipeResponse.data;
    const resJson = await createClientResponse(recipes);
    saveRecipe(resJson);

    res.json(resJson);
  } catch (err) {
    const error = err as AxiosError;
    const [status, json] = handleAxiosError(error);
    res.status(status).json(json);
  }
});

export default router;
