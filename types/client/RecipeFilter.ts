import { Cuisine, MealType, SpiceLevel } from "./Recipe";

export const RECIPE_SORT_FIELDS = [
  "calories",
  "health-score",
  "rating",
  "views",
] as const;
export type RecipeSortField = (typeof RECIPE_SORT_FIELDS)[number];
export const isValidSortField = (str: string): str is RecipeSortField => {
  return RECIPE_SORT_FIELDS.includes(str as RecipeSortField);
};
export const RECIPE_SORT_MAP: Record<RecipeSortField, string> = {
  // Calories will always be the first element in nutrients
  calories: "nutrients.0.amount",
  "health-score": "healthScore",
  rating: "averageRating",
  views: "views",
};

type RecipeFilter = {
  query: string;
  minCals: number;
  maxCals: number;
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  healthy: boolean;
  cheap: boolean;
  sustainable: boolean;
  rating: number;
  spiceLevels: Exclude<SpiceLevel, "unknown">[];
  types: MealType[];
  cultures: Cuisine[];
  token?: string; // either an ObjectId or searchSequenceToken for pagination
  sort?: RecipeSortField;
  asc?: boolean;
};

export default RecipeFilter;
