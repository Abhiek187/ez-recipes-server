import axios, { AxiosError, AxiosResponse } from "axios";
import { isErrorResponse } from "../routes/recipes";
import ErrorResponse from "../types/spoonacular/ErrorResponse";
import RecipeResponse from "../types/spoonacular/RecipeResponse";
import SearchResponse from "../types/spoonacular/SearchResponse";
import { isObject } from "../utils/object";
import {
  randomRecipeUrlBuilder,
  recipeIdUrlBuilder,
} from "../utils/recipeUtils";
import { isNumeric } from "../utils/string";

const isSearchResponse = (data: any): data is SearchResponse => {
  // Check that the data contains all the properties defined for SearchResponse
  if (!isObject(data)) {
    return false;
  }

  for (const prop of ["results", "offset", "number", "totalResults"]) {
    if (!data.hasOwnProperty(prop)) {
      console.log(`SearchResponse error: Prop ${prop} not found`);
      return false;
    }
  }

  return true;
};

const isRecipeResponse = (data: any): data is RecipeResponse => {
  // Check that the data contains all the properties defined for RecipeResponse
  if (!isObject(data)) {
    return false;
  }

  for (const prop of [
    "vegetarian",
    "vegan",
    "glutenFree",
    "dairyFree",
    "veryHealthy",
    "cheap",
    "veryPopular",
    "sustainable",
    "lowFodmap",
    "weightWatcherSmartPoints",
    "gaps",
    "preparationMinutes",
    "cookingMinutes",
    "aggregateLikes",
    "healthScore",
    "creditsText",
    "license",
    "sourceName",
    "pricePerServing",
    "id",
    "title",
    "readyInMinutes",
    "servings",
    "sourceUrl",
    "image",
    "imageType",
    "nutrition",
    "summary",
    "cuisines",
    "dishTypes",
    "diets",
    "occasions",
    "analyzedInstructions",
    "spoonacularSourceUrl",
  ]) {
    if (!data.hasOwnProperty(prop)) {
      console.log(`RecipeResponse error: Prop ${prop} not found`);
      return false;
    }
  }

  return true;
};

// Write tests based on the possible responses from openapi.yaml
const basePath = "/api/recipes";
const OLD_ENV = process.env;

beforeEach(() => {
  // Clear the cache before making a copy of the environment
  jest.resetModules();
  process.env = { ...OLD_ENV };
});

afterEach(() => {
  jest.restoreAllMocks();
  process.env = OLD_ENV; // restore the old environment
});

describe(`${basePath}/random`, () => {
  it("returns a SearchResponse on success", async () => {
    // Given the random recipe endpoint
    // When the API key is valid
    const [recipeUrl, headers] = randomRecipeUrlBuilder();
    let searchResponse: AxiosResponse<SearchResponse, any>;

    try {
      searchResponse = await axios.get<SearchResponse>(recipeUrl, {
        headers,
      });
    } catch (err) {
      throw new Error("The random recipe endpoint failed instead of succeeded");
    }

    // Then the response will be of type SearchResponse
    // (Moving outside the try-catch block to avoid catching any JestAssertionErrors)
    expect(searchResponse.status).toBe(200);

    const recipes = searchResponse.data;
    expect(isSearchResponse(recipes)).toBe(true);
  });

  it("returns a 401 error with an invalid API key", async () => {
    // Given the random recipe endpoint
    // When the API key is invalid
    process.env.API_KEY = "384ba039c39e90f";
    const [recipeUrl, headers] = randomRecipeUrlBuilder();

    try {
      await axios.get<SearchResponse>(recipeUrl, {
        headers,
      });

      throw new Error("The random recipe endpoint succeeded instead of failed");
    } catch (err) {
      // Then the response will be of type ErrorResponse with a status code of 401
      const error = err as AxiosError;
      const errorData = error.response?.data;

      expect(isErrorResponse(errorData)).toBe(true);
      expect((errorData as ErrorResponse).code).toBe(401);
    }
  });
});

describe(`${basePath}/:id`, () => {
  it("returns a RecipeResponse on success", async () => {
    // Given the recipe ID endpoint
    // When the API key and recipe ID are valid
    const recipeId = 660475;
    expect(isNumeric(recipeId)).toBe(true);

    const [recipeUrl, headers] = recipeIdUrlBuilder(recipeId);
    let recipeResponse: AxiosResponse<RecipeResponse, any>;

    try {
      recipeResponse = await axios.get<RecipeResponse>(recipeUrl, {
        headers,
      });
    } catch (err) {
      throw new Error("The recipe ID endpoint failed instead of succeeded");
    }

    // Then the response will be of type RecipeResponse
    expect(recipeResponse.status).toBe(200);

    const recipes = recipeResponse.data;
    expect(isRecipeResponse(recipes)).toBe(true);
  });

  it("returns a 401 error with an invalid API key", async () => {
    // Given the recipe ID endpoint
    // When the API key is invalid
    const recipeId = 660475;
    process.env.API_KEY = "384ba039c39e90f";
    expect(isNumeric(recipeId)).toBe(true);

    const [recipeUrl, headers] = recipeIdUrlBuilder(recipeId);

    try {
      await axios.get<RecipeResponse>(recipeUrl, {
        headers,
      });

      throw new Error("The recipe ID endpoint succeeded instead of failed");
    } catch (err) {
      // Then the response will be of type ErrorResponse with a status code of 401
      const error = err as AxiosError;
      const errorData = error.response?.data;

      expect(isErrorResponse(errorData)).toBe(true);
      expect((errorData as ErrorResponse).code).toBe(401);
    }
  });

  it("returns a 404 error with a nonexistent recipe ID", async () => {
    // Given the recipe ID endpoint
    // When the recipe ID doesn't exist
    const recipeId = -1;
    expect(isNumeric(recipeId)).toBe(true);

    const [recipeUrl, headers] = recipeIdUrlBuilder(recipeId);

    try {
      await axios.get<RecipeResponse>(recipeUrl, {
        headers,
      });

      throw new Error("The recipe ID endpoint succeeded instead of failed");
    } catch (err) {
      // Then the response will be of type ErrorResponse with a status code of 404
      const error = err as AxiosError;
      const errorData = error.response?.data;

      expect(isErrorResponse(errorData)).toBe(true);
      expect((errorData as ErrorResponse).code).toBe(404);
    }
  });
});
