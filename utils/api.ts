import axios, { AxiosError } from "axios";

import RecipeError from "../types/client/RecipeError";
import { isErrorResponse } from "./recipeUtils";

// Apply all common API settings
const api = axios.create({
  baseURL: "https://api.spoonacular.com/recipes",
  headers: {
    "x-api-key": process.env.API_KEY ?? "",
  },
  signal: new AbortController().signal, // allow requests to be cancelled as needed
});

/**
 * Helper function to handle API errors, returns a tuple of the status code and json response
 */
export const handleAxiosError = (error: AxiosError): [number, RecipeError] => {
  // Check if the error was due to spoonacular (invalid API key, invalid recipe ID, etc.)
  const errorData = error.response?.data;

  if (isErrorResponse(errorData)) {
    console.error(errorData);

    const errorBody: RecipeError = {
      error: errorData.message,
    };
    return [errorData.code, errorBody];
  }

  // Try returning the raw response, otherwise return a generic Axios error
  console.error(error);
  let errorMessage: string;

  if (typeof error.response?.data === "string") {
    errorMessage = error.response?.data as string;
  } else {
    errorMessage = `${error.name} (${error.code ?? "Error"}): ${error.message}`;
  }

  const errorBody: RecipeError = {
    error: errorMessage,
  };
  return [error.response?.status ?? 500, errorBody];
};

export default api;
