import { Cuisine, MealType } from "../client/Recipe";
import Instruction from "./Instruction";
import Nutrition from "./Nutrition";
import TasteResponse from "./TasteResponse";

type RecipeResponse = {
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
  veryHealthy: boolean;
  cheap: boolean;
  veryPopular: boolean;
  sustainable: boolean;
  lowFodmap: boolean;
  weightWatcherSmartPoints: number;
  gaps: string;
  preparationMinutes: number;
  cookingMinutes: number;
  aggregateLikes: number;
  healthScore: number;
  creditsText: string;
  license?: string;
  sourceName: string;
  pricePerServing: number;
  // extendedIngredients: any[];
  id: number;
  title: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  openLicense?: number; // not present in the recipe ID endpoint
  image: string;
  imageType: string;
  nutrition: Nutrition;
  taste?: TasteResponse;
  summary: string;
  cuisines: Cuisine[]; // [string] is a tuple with a string, while string[] is an array of strings
  dishTypes: MealType[];
  diets: string[];
  occasions: string[];
  instructions?: string; // some nullable props are only in the recipe ID endpoint
  analyzedInstructions: Instruction[];
  originalId?: number | null;
  spoonacularScore: number;
  spoonacularSourceUrl?: string; // not present in ID 1
};

export default RecipeResponse;
