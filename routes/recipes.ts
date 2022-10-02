import axios, { AxiosError } from "axios";
import express from "express";
import RecipeError from "../models/client/RecipeError";
import ErrorResponse from "../models/spoonacular/ErrorResponse";
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

// Type guard to check if a response contains all the error properties found in spoonacular
const isErrorResponse = (resp: any): resp is ErrorResponse => {
  // Assert that resp is an object: https://stackoverflow.com/a/8511350
  if (typeof resp !== "object" || Array.isArray(resp) || resp === null) {
    return false;
  }

  for (const prop of ["code", "message", "status"]) {
    if (!resp.hasOwnProperty(prop)) {
      return false;
    }
  }

  return true;
};

// Helper function to handle API errors, returns a tuple of the status code and json response
const handleAxiosError = (error: AxiosError): [number, RecipeError] => {
  // Check if the error was due to spoonacular (invalid API key, invalid recipe ID, etc.)
  const errorData = error.response?.data;

  if (isErrorResponse(errorData)) {
    console.error(errorData);

    const errorBody: RecipeError = {
      error: errorData.message,
    };
    return [errorData.code, errorBody];
  }

  // Return a generic Axios error
  const errorMessage = `${error.name} (${error.code ?? "Error"}): ${
    error.message
  }`;
  console.error(error);

  const errorBody: RecipeError = {
    error: errorMessage,
  };
  return [500, errorBody];
};

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
    const [status, json] = handleAxiosError(error);
    return res.status(status).json(json);
  }
});

// Get a recipe by its ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  // Check that ID in the URL is numeric to prevent SSRF (server-side request forgery) attacks
  if (!isNumeric(id)) {
    return res.status(400).json({ error: "The recipe ID must be numeric" });
  }

  const url = recipeIdUrlBuilder(Number(id));

  try {
    const recipeResponse = await axios.get<RecipeResponse>(url);
    logSpoonacularQuota(req.method, req.originalUrl, recipeResponse);

    const recipes = recipeResponse.data;
    const resJson = createClientResponse(recipes);

    return res.json(resJson);
  } catch (err) {
    const error = err as AxiosError;
    const [status, json] = handleAxiosError(error);
    return res.status(status).json(json);
  }
});

export default router;
