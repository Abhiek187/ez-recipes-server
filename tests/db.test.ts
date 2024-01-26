import { FilterQuery } from "mongoose";

import RecipeModel from "../models/RecipeModel";
import RecipeFilter from "../types/client/RecipeFilter";
import { filterRecipes } from "../utils/db";
import Recipe from "../types/client/Recipe";

describe("filterRecipes", () => {
  const mockFind = jest.fn().mockReturnValue({ exec: jest.fn() });
  jest.spyOn(RecipeModel, "find").mockImplementation(mockFind);

  it("filters by a number", async () => {
    // Given a number filter
    const filter: Partial<RecipeFilter> = {
      minCals: 1000,
    };

    // When filterRecipes is called
    await filterRecipes(filter);

    // Then the query uses a number operator
    const expectedQuery: FilterQuery<Recipe> = {
      "nutrients.name": "Calories",
      "nutrients.amount": { $gte: filter.minCals },
    };
    expect(mockFind).toHaveBeenCalledWith(expectedQuery);
  });

  it("filters by a boolean", async () => {
    // Given a boolean filter
    const filter: Partial<RecipeFilter> = {
      sustainable: true,
    };

    // When filterRecipes is called
    await filterRecipes(filter);

    // Then the query uses a boolean operator
    const expectedQuery: FilterQuery<Recipe> = {
      isSustainable: filter.sustainable,
    };
    expect(mockFind).toHaveBeenCalledWith(expectedQuery);
  });

  it("filters by an array", async () => {
    // Given an array filter
    const filter: Partial<RecipeFilter> = {
      cultures: ["Greek", "Mediterranean", "Vietnamese"],
    };

    // When filterRecipes is called
    await filterRecipes(filter);

    // Then the query uses an array operator
    const expectedQuery: FilterQuery<Recipe> = {
      culture: { $in: filter.cultures },
    };
    expect(mockFind).toHaveBeenCalledWith(expectedQuery);
  });

  it("filters by multiple values", async () => {
    // Given multiple filters
    const filter: Partial<RecipeFilter> = {
      maxCals: 600,
      healthy: true,
      cheap: true,
      spiceLevels: ["none"],
    };

    // When filterRecipes is called
    await filterRecipes(filter);

    // Then the query includes all those filters
    const expectedQuery: FilterQuery<Recipe> = {
      "nutrients.name": "Calories",
      "nutrients.amount": { $lte: filter.maxCals },
      isHealthy: filter.healthy,
      isCheap: filter.cheap,
      spiceLevel: { $in: filter.spiceLevels },
    };
    expect(mockFind).toHaveBeenCalledWith(expectedQuery);
  });

  it("filters by everything", async () => {
    // Given all supported filters
    const filter: RecipeFilter = {
      minCals: 0,
      maxCals: 500,
      vegetarian: true,
      vegan: false,
      glutenFree: true,
      healthy: false,
      cheap: true,
      sustainable: true,
      spiceLevels: ["spicy"],
      types: ["main course", "breakfast"],
      cultures: ["Asian", "Cajun", "Indian", "Spanish"],
    };

    // When filterRecipes is called
    await filterRecipes(filter);

    // Then the query combines all the filters
    const expectedQuery: FilterQuery<Recipe> = {
      "nutrients.name": "Calories",
      "nutrients.amount": { $gte: filter.minCals, $lte: filter.maxCals },
      isVegetarian: filter.vegetarian,
      isVegan: filter.vegan,
      isGlutenFree: filter.glutenFree,
      isHealthy: filter.healthy,
      isCheap: filter.cheap,
      isSustainable: filter.sustainable,
      spiceLevel: { $in: filter.spiceLevels },
      types: { $in: filter.types },
      culture: { $in: filter.cultures },
    };
    expect(mockFind).toHaveBeenCalledWith(expectedQuery);
  });
});
