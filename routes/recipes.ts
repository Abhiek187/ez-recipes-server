import { AxiosError } from "axios";
import express, { Response } from "express";

import RecipeResponse from "../types/spoonacular/RecipeResponse";
import SearchResponse from "../types/spoonacular/SearchResponse";
import {
  createClientResponse,
  isValidSpiceLevel,
  logSpoonacularQuota,
  randomRecipeUrlBuilder,
  recipeIdUrlBuilder,
} from "../utils/recipeUtils";
import { isNumeric } from "../utils/string";
import api, { handleAxiosError } from "../utils/api";
import { fetchRecipe, filterRecipes, saveRecipe } from "../utils/db";
import RecipeFilter from "../types/client/RecipeFilter";
import {
  CUISINES,
  Cuisine,
  MEAL_TYPES,
  MealType,
} from "../types/client/Recipe";

const badRequestError = (res: Response, error: string) => {
  res.status(400).json({ error });
};

const router = express.Router();

// Query recipes in MongoDB
router.get("/", async (req, res) => {
  const {
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
  } = req.query;
  const filter: Partial<RecipeFilter> = {};

  // Sanitize all the query parameters
  if (minCals !== undefined) {
    if (typeof minCals !== "string" || !isNumeric(minCals)) {
      return badRequestError(res, "min-cals is not numeric");
    }

    const minCalsNum = Number(minCals);

    if (minCalsNum < 0) {
      return badRequestError(res, "min-cals must be >= 0");
    }

    filter.minCals = minCalsNum;
  }
  if (maxCals !== undefined) {
    if (typeof maxCals !== "string" || !isNumeric(maxCals)) {
      return badRequestError(res, "max-cals is not numeric");
    }

    const maxCalsNum = Number(maxCals);

    if (maxCalsNum < 0) {
      return badRequestError(res, "max-cals must be >= 0");
    }

    filter.maxCals = maxCalsNum;
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
  if (spiceLevel !== undefined) {
    // If the query parameter appears once, it's a string
    // Otherwise, it's an array of strings
    if (typeof spiceLevel === "string") {
      if (isValidSpiceLevel(spiceLevel)) {
        filter.spiceLevels = [spiceLevel];
      } else {
        return badRequestError(
          res,
          `Unknown spice level received: ${spiceLevel}`
        );
      }
    } else if (Array.isArray(spiceLevel)) {
      filter.spiceLevels = [];

      for (const spice of spiceLevel) {
        if (typeof spice === "string" && isValidSpiceLevel(spice)) {
          filter.spiceLevels.push(spice);
        } else {
          return badRequestError(res, `Unknown spice level received: ${spice}`);
        }
      }
    }
  }
  if (type !== undefined) {
    if (typeof type === "string") {
      if (MEAL_TYPES.includes(type as MealType)) {
        filter.types = [type as MealType];
      } else {
        return badRequestError(res, `Unknown meal type received: ${type}`);
      }
    } else if (Array.isArray(type)) {
      filter.types = [];

      for (const mealType of type) {
        if (MEAL_TYPES.includes(mealType as MealType)) {
          filter.types.push(mealType as MealType);
        } else {
          return badRequestError(
            res,
            `Unknown meal type received: ${mealType}`
          );
        }
      }
    }
  }
  if (culture !== undefined) {
    if (typeof culture === "string") {
      if (CUISINES.includes(culture as Cuisine)) {
        filter.cultures = [culture as Cuisine];
      } else {
        return badRequestError(res, `Unknown cuisine received: ${culture}`);
      }
    } else if (Array.isArray(culture)) {
      filter.cultures = [];

      for (const cuisine of culture) {
        if (CUISINES.includes(cuisine as Cuisine)) {
          filter.cultures.push(cuisine as Cuisine);
        } else {
          return badRequestError(res, `Unknown cuisine received: ${cuisine}`);
        }
      }
    }
  }

  const recipes = await filterRecipes(filter);
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
