import { AxiosError, AxiosResponse } from "axios";

import ErrorResponse from "../types/spoonacular/ErrorResponse";
import RecipeResponse from "../types/spoonacular/RecipeResponse";
import SearchResponse from "../types/spoonacular/SearchResponse";
import {
  isErrorResponse,
  isRecipeResponse,
  isSearchResponse,
  randomRecipeUrlBuilder,
  recipeIdUrlBuilder,
} from "../utils/recipeUtils";
import { isNumeric } from "../utils/string";
import api from "../utils/api";

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
    const recipeUrl = randomRecipeUrlBuilder();
    let searchResponse: AxiosResponse<SearchResponse>;

    try {
      searchResponse = await api.get<SearchResponse>(recipeUrl);
    } catch (err) {
      throw new Error(
        `The random recipe endpoint failed instead of succeeded: ${err}`
      );
    }

    // Then the response will be of type SearchResponse
    // (Moving outside the try-catch block to avoid catching any JestAssertionErrors)
    expect(searchResponse.status).toBe(200);

    const recipes = searchResponse.data;
    console.log("(random 200) recipes = ", recipes);
    expect(isSearchResponse(recipes)).toBe(true);
  });

  it("returns a 401 error with an invalid API key", async () => {
    // Given the random recipe endpoint
    // When the API key is invalid
    const recipeUrl = randomRecipeUrlBuilder();

    try {
      await api.get<SearchResponse>(recipeUrl, {
        headers: {
          "x-api-key": "384ba039c39e90f",
        },
      });

      throw new Error("The random recipe endpoint succeeded instead of failed");
    } catch (err) {
      // Then the response will be of type ErrorResponse with a status code of 401
      const error = err as AxiosError;
      const errorData = error.response?.data;

      console.log("(random 401) errorData = ", errorData);
      expect(isErrorResponse(errorData)).toBe(true);
      expect((errorData as ErrorResponse).code).toBe(401);
    }
  });
});

describe(`${basePath}/:id`, () => {
  it("returns a RecipeResponse on success", async () => {
    // Given the recipe ID endpoint
    // When the API key and recipe ID are valid
    const recipeId = "660475";
    expect(isNumeric(recipeId)).toBe(true);

    const recipeUrl = recipeIdUrlBuilder(recipeId);
    let recipeResponse: AxiosResponse<RecipeResponse>;

    try {
      recipeResponse = await api.get<RecipeResponse>(recipeUrl);
    } catch (err) {
      throw new Error(
        `The recipe ID endpoint failed instead of succeeded: ${err}`
      );
    }

    // Then the response will be of type RecipeResponse
    expect(recipeResponse.status).toBe(200);

    const recipes = recipeResponse.data;
    console.log("(ID 200) recipes = ", recipes);
    expect(isRecipeResponse(recipes)).toBe(true);
  });

  it("returns a 401 error with an invalid API key", async () => {
    // Given the recipe ID endpoint
    // When the API key is invalid
    const recipeId = "660475";
    expect(isNumeric(recipeId)).toBe(true);

    const recipeUrl = recipeIdUrlBuilder(recipeId);

    try {
      await api.get<RecipeResponse>(recipeUrl, {
        headers: {
          "x-api-key": "384ba039c39e90f",
        },
      });

      throw new Error("The recipe ID endpoint succeeded instead of failed");
    } catch (err) {
      // Then the response will be of type ErrorResponse with a status code of 401
      const error = err as AxiosError;
      const errorData = error.response?.data;

      console.log("(ID 401) errorData = ", errorData);
      expect(isErrorResponse(errorData)).toBe(true);
      expect((errorData as ErrorResponse).code).toBe(401);
    }
  });

  it("returns a 404 error with a nonexistent recipe ID", async () => {
    // Given the recipe ID endpoint
    // When the recipe ID doesn't exist
    const recipeId = "-1";
    expect(isNumeric(recipeId)).toBe(true);

    const recipeUrl = recipeIdUrlBuilder(recipeId);

    try {
      await api.get<RecipeResponse>(recipeUrl);

      throw new Error("The recipe ID endpoint succeeded instead of failed");
    } catch (err) {
      // Then the response will be of type ErrorResponse with a status code of 404
      const error = err as AxiosError;
      const errorData = error.response?.data;

      console.log("(ID 404) errorData = ", errorData);
      expect(isErrorResponse(errorData)).toBe(true);
      expect((errorData as ErrorResponse).code).toBe(404);
    }
  });
});
