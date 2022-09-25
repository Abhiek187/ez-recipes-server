import RecipeResponse from "./RecipeResponse";

type SearchResponse = {
  results: RecipeResponse[];
  offset: number;
  number: number;
  totalResults: number;
};

export default SearchResponse;
