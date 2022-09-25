import axios, { AxiosError } from "axios";
import express from "express";
import RecipeResponse from "../models/spoonacular/RecipeResponse";
import SearchResponse from "../models/spoonacular/SearchResponse";
import {
  createClientResponse,
  logSpoonacularQuota,
  randomRecipeUrlBuilder,
  recipeIdUrlBuilder,
} from "../utils/recipeUtils";
import { isNumeric } from "../utils/string";

const router = express.Router();

// Get a random, low-effort recipe
router.get("/random", async (req, res) => {
  const url = randomRecipeUrlBuilder();

  try {
    const recipeResponse = await axios.get<SearchResponse>(url);
    logSpoonacularQuota(req.method, req.originalUrl, recipeResponse);

    const recipes = recipeResponse.data;
    const resJson = createClientResponse(recipes);

    return res.json(resJson);
  } catch (err) {
    const error = err as AxiosError;
    const errorMessage = `${error.name} (${error.code ?? "Error"}): ${
      error.message
    }`;
    console.error(error);
    return res.status(500).json({ error: errorMessage });
  }
});

// Get a recipe by its ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  // Check that ID in the URL is numeric to prevent SSRF (server-side request forgery) attacks
  if (!isNumeric(id)) {
    return res.status(400).json({ error: "The recipe ID must be numeric" });
  }

  const url = recipeIdUrlBuilder(id);

  try {
    const recipeResponse = await axios.get<RecipeResponse>(url);
    logSpoonacularQuota(req.method, req.originalUrl, recipeResponse);

    const recipes = recipeResponse.data;
    const resJson = createClientResponse(recipes);

    return res.json(resJson);
  } catch (err) {
    const error = err as AxiosError;
    const errorMessage = `${error.name} (${error.code ?? "Error"}): ${
      error.message
    }`;
    console.error(error);
    return res.status(500).json({ error: errorMessage });
  }
});

export default router;
