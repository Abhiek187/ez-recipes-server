import { AxiosError } from "axios";
import express, { Response } from "express";
import { isValidObjectId } from "mongoose";

import RecipeResponse from "../types/spoonacular/RecipeResponse";
import SearchResponse from "../types/spoonacular/SearchResponse";
import {
  createClientResponse,
  logSpoonacularQuota,
  randomRecipeUrlBuilder,
  recipeIdUrlBuilder,
  sanitizeEnum,
  sanitizeEnumArray,
  sanitizeNumber,
} from "../utils/recipeUtils";
import { isNumeric } from "../utils/string";
import api, { handleAxiosError } from "../utils/api";
import { fetchRecipe, filterRecipes, saveRecipe } from "../utils/db";
import RecipeFilter from "../types/client/RecipeFilter";
import {
  isValidSpiceLevel,
  isValidMealType,
  isValidCuisine,
} from "../types/client/Recipe";

const badRequestError = (res: Response, error: string) => {
  res.status(400).json({ error });
};

const router = express.Router();

// Query recipes in MongoDB
router.get("/", async (req, res) => {
  console.log(`${req.method} ${req.originalUrl}`);
  const {
    query,
    "min-cals": minCals,
    "max-cals": maxCals,
    vegetarian,
    vegan,
    "gluten-free": glutenFree,
    healthy,
    cheap,
    sustainable,
    "spice-level": spiceLevel,
    type,
    culture,
    token,
  } = req.query;
  const filter: Partial<RecipeFilter> = {};

  // Sanitize all the query parameters
  if (typeof query === "string") {
    filter.query = query || undefined; // ignore empty queries
  }

  try {
    if (minCals !== undefined) {
      filter.minCals = sanitizeNumber(minCals, "min-cals", 0, 2000);
    }
    if (maxCals !== undefined) {
      filter.maxCals = sanitizeNumber(maxCals, "max-cals", 0, 2000);
    }
  } catch (error) {
    return badRequestError(res, error as string);
  }

  if (vegetarian !== undefined) {
    filter.vegetarian = true;
  }
  if (vegan !== undefined) {
    filter.vegan = true;
  }
  if (glutenFree !== undefined) {
    filter.glutenFree = true;
  }
  if (healthy !== undefined) {
    filter.healthy = true;
  }
  if (cheap !== undefined) {
    filter.cheap = true;
  }
  if (sustainable !== undefined) {
    filter.sustainable = true;
  }

  try {
    // If the query parameter appears once, it's a string
    // Otherwise, it's an array of strings
    if (typeof spiceLevel === "string") {
      filter.spiceLevels = [
        sanitizeEnum(spiceLevel, "spice level", isValidSpiceLevel),
      ];
    } else if (Array.isArray(spiceLevel)) {
      filter.spiceLevels = sanitizeEnumArray(
        spiceLevel,
        "spice level",
        isValidSpiceLevel
      );
    }
    if (typeof type === "string") {
      filter.types = [sanitizeEnum(type, "meal type", isValidMealType)];
    } else if (Array.isArray(type)) {
      filter.types = sanitizeEnumArray(type, "meal type", isValidMealType);
    }
    if (typeof culture === "string") {
      filter.cultures = [sanitizeEnum(culture, "cuisine", isValidCuisine)];
    } else if (Array.isArray(culture)) {
      filter.cultures = sanitizeEnumArray(culture, "cuisine", isValidCuisine);
    }
  } catch (error) {
    return badRequestError(res, error as string);
  }

  if (typeof token === "string") {
    // An ObjectId must be passed if a find query should be performed
    if (filter.query === undefined && !isValidObjectId(token)) {
      return badRequestError(res, `Token "${token}" is not a valid ObjectId`);
    }

    // Search tokens will be validated during the query
    filter.token = token;
  }

  const recipes = await filterRecipes(filter);

  if (typeof recipes === "string") {
    return badRequestError(res, recipes);
  } else if (recipes === null) {
    return res
      .status(500)
      .json({ error: "Failed to filter recipes. Please try again later." });
  }

  res.json(recipes);
});

// Get a random, low-effort recipe
router.get("/random", async (req, res) => {
  const url = randomRecipeUrlBuilder();

  try {
    const recipeResponse = await api.get<SearchResponse>(url);
    logSpoonacularQuota(req.method, req.originalUrl, recipeResponse);

    const recipes = recipeResponse.data;
    const resJson = await createClientResponse(recipes);
    const _id = await saveRecipe(resJson); // cache in MongoDB

    res.json({
      ...resJson,
      _id,
    });
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
    const _id = await saveRecipe(resJson);

    res.json({
      ...resJson,
      _id,
    });
  } catch (err) {
    const error = err as AxiosError;
    const [status, json] = handleAxiosError(error);
    res.status(status).json(json);
  }
});

export default router;
