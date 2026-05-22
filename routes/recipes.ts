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
import PDFCreate from "../utils/pdf-create";
import { zip } from "../utils/array";

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
        !isValidObjectId(objectId)
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

router.get("/:id/pdf", async (req, res) => {
  const { id } = req.params;

  if (!isNumeric(id)) {
    res.status(400).json({ error: "The recipe ID must be numeric" });
    return;
  }

  const recipe = await fetchRecipe(Number(id));

  if (recipe === null) {
    res
      .status(404)
      .json({ error: `A recipe with the id ${id} does not exist.` });
    return;
  }

  const pdf = new PDFCreate();

  pdf.text(recipe.name, { bold: true, size: 20, align: "center" });
  await pdf.addImage(recipe.image, 62.4, 46.2, { align: "center" });
  pdf.text(`Image © ${recipe.credit}`, { size: 12, align: "center" });

  pdf.beginLine();
  if (["mild", "spicy"].includes(recipe.spiceLevel)) {
    pdf.text(recipe.spiceLevel, { pill: true });
  }
  if (recipe.isVegetarian) pdf.text("Vegetarian", { pill: true });
  if (recipe.isVegan) pdf.text("Vegan", { pill: true });
  if (recipe.isGlutenFree) pdf.text("Gluten-Free", { pill: true });
  if (recipe.isHealthy) pdf.text("Healthy", { pill: true });
  if (recipe.isCheap) pdf.text("Cheap", { pill: true });
  if (recipe.isSustainable) pdf.text("Sustainable", { pill: true });
  pdf.endLine();

  pdf.beginLine(30);
  pdf.text("Time:", { bold: true });
  pdf.text(`${recipe.time} minutes`);
  pdf.endLine();
  pdf.beginLine(30);
  pdf.text("Great for:", { bold: true });
  pdf.text(`${recipe.types.join(", ")}`);
  pdf.endLine();
  pdf.beginLine(30);
  pdf.text("Cuisines:", { bold: true });
  pdf.text(`${recipe.culture.join(", ")}`);
  pdf.endLine();
  pdf.divider();

  // Display nutrition facts and ingredients side-by-side
  pdf.beginLine();
  pdf.text("Nutrition Facts", { bold: true, size: 18 });
  pdf.text("Ingredients", { bold: true, size: 18, align: "right" });
  pdf.endLine();
  pdf.beginLine();
  pdf.text(`Health Score: ${recipe.healthScore}%`);
  if (recipe.ingredients.length > 0) {
    pdf.text(
      `${recipe.ingredients[0].amount} ${recipe.ingredients[0].unit} ${recipe.ingredients[0].name}`,
      {
        align: "right",
      }
    );
  }
  pdf.endLine();
  pdf.beginLine();
  pdf.text(`${recipe.servings} servings`);
  if (recipe.ingredients.length > 1) {
    pdf.text(
      `${recipe.ingredients[1].amount} ${recipe.ingredients[1].unit} ${recipe.ingredients[1].name}`,
      {
        align: "right",
      }
    );
  }
  pdf.endLine();

  const nutrientIngredients = zip(
    recipe.nutrients,
    recipe.ingredients.slice(2)
  );
  for (const [nutrient, ingredient] of nutrientIngredients) {
    pdf.beginLine();
    pdf.text(
      nutrient === undefined
        ? ""
        : `${nutrient.name}: ${Math.round(nutrient.amount)} ${nutrient.unit}`,
      {
        bold:
          nutrient !== undefined &&
          ["Calories", "Fat", "Carbohydrates", "Protein"].includes(
            nutrient.name
          ),
      }
    );
    pdf.text(
      ingredient === undefined
        ? ""
        : `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`,
      {
        align: "right",
      }
    );
    pdf.endLine();
  }
  pdf.divider();

  pdf.text("Steps", { bold: true, size: 18 });
  for (const instruction of recipe.instructions) {
    if (instruction.name.length > 0) {
      pdf.text(instruction.name);
    }

    for (const step of instruction.steps) {
      pdf.text(`${step.number}. ${step.step}`);

      if (step.ingredients.length > 0) {
        pdf.beginLine(40);
        pdf.text("Ingredients", { bold: true });
        for (const ingredient of step.ingredients) {
          await pdf.addImage(
            `https://img.spoonacular.com/ingredients_100x100/${ingredient.image}`,
            20,
            20
          );
        }
        pdf.endLine(3);

        pdf.beginLine(40);
        pdf.text(""); // spacer
        for (const ingredient of step.ingredients) {
          pdf.text(ingredient.name);
        }
        pdf.endLine();
      }

      if (step.equipment.length > 0) {
        pdf.beginLine(40);
        pdf.text("Equipment", { bold: true });
        for (const equipment of step.equipment) {
          await pdf.addImage(
            `https://img.spoonacular.com/equipment_100x100/${equipment.image}`,
            20,
            20
          );
        }
        pdf.endLine(3);

        pdf.beginLine(40);
        pdf.text("");
        for (const equipment of step.equipment) {
          pdf.text(equipment.name);
        }
        pdf.endLine();
      }

      pdf.divider();
    }
  }
  pdf.text("Powered by spoonacular", { size: 12 });

  const pdfBuffer = pdf.doc.output("arraybuffer");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${recipe.name}.pdf`
  );
  res.send(Buffer.from(pdfBuffer));
});

export default router;
