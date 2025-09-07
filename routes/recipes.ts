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
import { isInteger, isNumeric } from "../utils/string";
import spoonacularApi, { handleAxiosError } from "../utils/api";
import {
  fetchRecipe,
  filterRecipes,
  recipeExists,
  saveRecipe,
  updateChef,
  updateRecipeStats,
} from "../utils/db";
import RecipeFilter, {
  isValidSortField,
  RECIPE_SORT_MAP,
} from "../types/client/RecipeFilter";
import {
  isValidSpiceLevel,
  isValidMealType,
  isValidCuisine,
} from "../types/client/Recipe";
import auth from "../middleware/auth";
import RecipePatch from "../types/client/RecipePatch";
import { isObject } from "../utils/object";
import checkAuthStatus from "../utils/auth/checkAuthStatus";

const badRequestError = (res: Response, error: string) => {
  res.status(400).json({ error });
};

const router = express.Router();

// Query recipes in MongoDB
router.get("/", async (req, res) => {
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
    rating,
    "spice-level": spiceLevel,
    type,
    culture,
    token,
    sort,
    asc,
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
    if (rating !== undefined) {
      filter.rating = sanitizeNumber(rating, "rating", 1, 5);
    }
  } catch (error) {
    badRequestError(res, error as string);
    return;
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

  if (asc !== undefined) {
    filter.asc = true;
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

    if (typeof sort === "string") {
      filter.sort = sanitizeEnum(sort, "sort", isValidSortField);
    }
  } catch (error) {
    badRequestError(res, error as string);
    return;
  }

  if (typeof token === "string") {
    // If sorting & paginating, check if the compound token is valid
    // Compound token format: sort_field:last_value:object_id
    if (
      filter.sort !== undefined &&
      (filter.query === undefined || filter.sort === "calories")
    ) {
      const [sortField, lastValue, objectId] = token.split(":");

      if (
        sortField !== RECIPE_SORT_MAP[filter.sort] ||
        lastValue === undefined ||
        objectId === undefined
      ) {
        badRequestError(res, `Token "${token}" is not a valid compound token`);
        return;
      }
    }
    // An ObjectId must be passed if a find query should be performed
    else if (filter.query === undefined && !isValidObjectId(token)) {
      badRequestError(res, `Token "${token}" is not a valid ObjectId`);
      return;
    }

    // Search tokens will be validated during the query
    filter.token = token;
  }

  const recipes = await filterRecipes(filter);

  if (typeof recipes === "string") {
    badRequestError(res, recipes);
  } else if (recipes === null) {
    res
      .status(500)
      .json({ error: "Failed to filter recipes. Please try again later." });
  } else {
    res.json(recipes);
  }
});

// Get a random, low-effort recipe
router.get("/random", async (req, res) => {
  // Check if the user is authorized before using spoonacular quota
  checkAuthStatus(req, res);
  if (res.writableEnded) return;

  const url = randomRecipeUrlBuilder();

  try {
    const recipeResponse = await spoonacularApi.get<SearchResponse>(url);
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
    res.status(400).json({ error: "The recipe ID must be numeric" });
    return;
  }

  // If the recipe exists in MongoDB, return that to save an API call to spoonacular
  const existingRecipe = await fetchRecipe(Number(id));

  if (existingRecipe !== null) {
    res.json(existingRecipe);
    return;
  }
  checkAuthStatus(req, res);
  if (res.writableEnded) return;

  const url = recipeIdUrlBuilder(id);

  try {
    const recipeResponse = await spoonacularApi.get<RecipeResponse>(url);
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

router.patch("/:id", auth, async (req, res) => {
  // Update info for both the recipe and chef
  const { token, uid } = res.locals;
  const { id } = req.params;
  const body = req.body as RecipePatch | undefined;

  // Param validations
  if (!isNumeric(id)) {
    res.status(400).json({ error: "The recipe ID must be numeric" });
    return;
  }

  // Body validations
  if (body === undefined || !isObject(body)) {
    res.status(400).json({
      error: "One of 'rating', 'view', or 'isFavorite' must be provided",
    });
    return;
  }
  if (
    body.rating !== undefined &&
    (!isInteger(body.rating) || body.rating < 1 || body.rating > 5)
  ) {
    res
      .status(400)
      .json({ error: "The rating must be a whole number between 1 and 5" });
    return;
  }
  if (body.view !== undefined && typeof body.view !== "boolean") {
    res.status(400).json({ error: "'view' must be true or false" });
    return;
  }
  if (body.isFavorite !== undefined && typeof body.isFavorite !== "boolean") {
    res.status(400).json({ error: "'isFavorite' must be true or false" });
    return;
  }

  // Recipe validations
  if (!(await recipeExists(Number(id)))) {
    res.status(404).json({ error: `Recipe with ID ${id} not found` });
    return;
  }

  // Check if the user already rated a recipe and update the average/total accordingly
  const isAuthenticated = uid !== undefined;
  let oldRating = undefined;

  if (isAuthenticated) {
    const [newOldRating, updateChefError] = await updateChef(uid, id, body);
    oldRating = newOldRating;

    if (updateChefError !== undefined) {
      res.status(updateChefError.code).json({ error: updateChefError.message });
      return;
    }
  }

  const updateRecipeError = await updateRecipeStats(
    Number(id),
    body,
    isAuthenticated,
    oldRating
  );
  if (updateRecipeError !== undefined) {
    res
      .status(updateRecipeError.code)
      .json({ error: updateRecipeError.message });
    return;
  }

  res.status(200).json({ token });
});

export default router;
