import { Cuisine, MealType, SpiceLevel } from "./Recipe";

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
  spiceLevels: Exclude<SpiceLevel, "unknown">[];
  types: MealType[];
  cultures: Cuisine[];
};

export default RecipeFilter;
