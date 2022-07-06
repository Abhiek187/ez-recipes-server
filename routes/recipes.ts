import axios, { AxiosError } from "axios";
import express from "express";
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
