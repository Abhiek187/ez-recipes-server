import axios, { AxiosError } from "axios";
import express from "express";
import SearchResponse from "../models/spoonacular/SearchResponse";
import {
  createClientResponse,
  logSpoonacularQuota,
  recipeUrlBuilder,
} from "../utils/recipeUtils";

const router = express.Router();

// Get a random, low-effort recipe
router.get("/random", async (req, res) => {
  const url = recipeUrlBuilder();

  try {
    const recipeResponse = await axios.get<SearchResponse>(url);
    logSpoonacularQuota(recipeResponse);

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
