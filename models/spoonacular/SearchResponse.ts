import { Instruction } from "./Instruction";
import { Nutrition } from "./Nutrition";

export type SearchResponse = {
  results: [
    {
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
      aggregateLikeks: number;
      healthScore: number;
      creditsText: string;
      license: string;
      sourceName: string;
      pricePerServing: number;
      id: number;
      title: string;
      readyInMinutes: number;
      servings: number;
      sourceUrl: string;
      openLicense: number;
      image: string;
      imageType: string;
      nutrition: Nutrition;
      summary: string;
      cuisines: [string];
      dishTypes: [string];
      diets: [string];
      occasions: [string];
      analyzedInstructions: [Instruction];
      spoonacularSourceUrl: string;
    }
  ];
  offset: number;
  number: number;
  totalResults: number;
};
