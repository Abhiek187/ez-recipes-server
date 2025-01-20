import { FilterQuery, Types } from "mongoose";

import RecipeModel from "../models/RecipeModel";
import RecipeFilter from "../types/client/RecipeFilter";
import { Indexes, MAX_DOCS, filterRecipes } from "../utils/db";
import Recipe from "../types/client/Recipe";

describe("recipeFindQuery", () => {
  const mockExec = jest.fn();
  const mockLimit = jest.fn().mockReturnValue({ exec: mockExec });
  const mockFind = jest.fn().mockReturnValue({ limit: mockLimit });
  jest.spyOn(RecipeModel, "find").mockImplementation(mockFind);

  it("accepts no filter", async () => {
    // Given no filter
    // When filterRecipes is called
    await filterRecipes({});
    // Then the query is also empty
    expect(mockFind).toHaveBeenCalledWith({});
    expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
  });

  it("filters by a number", async () => {
    // Given a number filter
    const filter: Partial<RecipeFilter> = {
      minCals: 1000,
    };

    // When filterRecipes is called
    await filterRecipes(filter);

    // Then the query uses a number operator
    const expectedQuery: FilterQuery<Recipe> = {
      nutrients: {
        $elemMatch: {
          name: "Calories",
          amount: {
            $gte: filter.minCals,
          },
        },
      },
    };
    expect(mockFind).toHaveBeenCalledWith(expectedQuery);
    expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
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
    expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
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
    expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
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
      nutrients: {
        $elemMatch: {
          name: "Calories",
          amount: {
            $lte: filter.maxCals,
          },
        },
      },
      isHealthy: filter.healthy,
      isCheap: filter.cheap,
      spiceLevel: { $in: filter.spiceLevels },
    };
    expect(mockFind).toHaveBeenCalledWith(expectedQuery);
    expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
  });

  it("filters by everything", async () => {
    // Given all supported filters
    const filter: Omit<RecipeFilter, "query"> = {
      minCals: 0,
      maxCals: 500,
      vegetarian: true,
      vegan: false,
      glutenFree: true,
      healthy: false,
      cheap: true,
      sustainable: true,
      rating: 4,
      spiceLevels: ["spicy"],
      types: ["main course", "breakfast"],
      cultures: ["Asian", "Cajun", "Indian", "Spanish"],
    };

    // When filterRecipes is called
    await filterRecipes(filter);

    // Then the query combines all the filters
    const expectedQuery: FilterQuery<Recipe> = {
      nutrients: {
        $elemMatch: {
          name: "Calories",
          amount: {
            $gte: filter.minCals,
            $lte: filter.maxCals,
          },
        },
      },
      isVegetarian: filter.vegetarian,
      isVegan: filter.vegan,
      isGlutenFree: filter.glutenFree,
      isHealthy: filter.healthy,
      isCheap: filter.cheap,
      isSustainable: filter.sustainable,
      averageRating: { $gte: filter.rating },
      spiceLevel: { $in: filter.spiceLevels },
      types: { $in: filter.types },
      culture: { $in: filter.cultures },
    };
    expect(mockFind).toHaveBeenCalledWith(expectedQuery);
    expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
  });

  it("filters with an ObjectId token", async () => {
    // Given a filter with a token
    const filter: Partial<RecipeFilter> = {
      token: "660f1af0b5ba9017ad8e5079",
    };

    // When filterRecipes is called
    await filterRecipes(filter);

    // Then the query checks the _id field
    const expectedQuery: FilterQuery<Recipe> = {
      _id: {
        $gt: new Types.ObjectId(filter.token),
      },
    };
    expect(mockFind).toHaveBeenCalledWith(expectedQuery);
    expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
  });
});

describe("recipeAggregateQuery", () => {
  const mockExec = jest.fn();
  const mockAddFields = jest.fn().mockReturnValue({ exec: mockExec });
  const mockLimit = jest.fn().mockReturnValue({ addFields: mockAddFields });
  const mockMatch = jest.fn().mockReturnValue({ limit: mockLimit });
  const mockSearch = jest
    .fn()
    .mockReturnValue({ match: mockMatch, limit: mockLimit });
  const mockAggregate = jest.fn().mockReturnValue({ search: mockSearch });
  jest.spyOn(RecipeModel, "aggregate").mockImplementation(mockAggregate);

  it("excludes $match with only a query filter", async () => {
    // Given a recipe filter with a query
    const filter: Partial<RecipeFilter> = {
      query: "chicken",
    };

    // When filterRecipes is called
    await filterRecipes(filter);

    // Then an aggregation pipeline is used with only a $search stage
    expect(mockSearch).toHaveBeenCalledWith({
      index: Indexes.RecipeName,
      text: {
        query: filter.query,
        path: {
          wildcard: "*",
        },
      },
    });
    expect(mockMatch).not.toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
    expect(mockAddFields).toHaveBeenCalledWith({
      token: {
        $meta: "searchSequenceToken",
      },
    });
  });

  it("includes searchAfter if a token is passed", async () => {
    // Given a recipe filter with a token
    const filter: Partial<RecipeFilter> = {
      query: "chicken",
      token: "CPUCFaxgNUA=",
    };

    // When filterRecipes is called
    await filterRecipes(filter);

    // Then searchAfter is included in the $search stage
    expect(mockSearch).toHaveBeenCalledWith({
      index: Indexes.RecipeName,
      text: {
        query: filter.query,
        path: {
          wildcard: "*",
        },
      },
      searchAfter: filter.token,
    });
    expect(mockMatch).not.toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
    expect(mockAddFields).toHaveBeenCalledWith({
      token: {
        $meta: "searchSequenceToken",
      },
    });
  });

  it("adds $match with one additional filter", async () => {
    // Given a recipe filter with a query and another filter
    const filter: Partial<RecipeFilter> = {
      query: "pasta",
      vegetarian: true,
    };

    // When filterRecipes is called
    await filterRecipes(filter);

    // Then the $search and $match stages are used
    expect(mockSearch).toHaveBeenCalledWith({
      index: Indexes.RecipeName,
      text: {
        query: filter.query,
        path: {
          wildcard: "*",
        },
      },
    });
    expect(mockMatch).toHaveBeenCalledWith({
      isVegetarian: filter.vegetarian,
    });
    expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
    expect(mockAddFields).toHaveBeenCalledWith({
      token: {
        $meta: "searchSequenceToken",
      },
    });
  });

  it("adds $match with multiple additional filters", async () => {
    // Given a recipe filter with a query and multiple filters
    const filter: Partial<RecipeFilter> = {
      query: "tacos",
      minCals: 300,
      cheap: true,
      sustainable: true,
      spiceLevels: ["mild", "spicy"],
      cultures: ["Mexican", "Spanish"],
    };

    // When filterRecipes is called
    await filterRecipes(filter);

    // Then the $search and $match stages are used
    expect(mockSearch).toHaveBeenCalledWith({
      index: Indexes.RecipeName,
      text: {
        query: filter.query,
        path: {
          wildcard: "*",
        },
      },
    });
    expect(mockMatch).toHaveBeenCalledWith({
      nutrients: {
        $elemMatch: {
          name: "Calories",
          amount: {
            $gte: filter.minCals,
          },
        },
      },
      isCheap: filter.cheap,
      isSustainable: filter.sustainable,
      spiceLevel: { $in: filter.spiceLevels },
      culture: { $in: filter.cultures },
    });
    expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
    expect(mockAddFields).toHaveBeenCalledWith({
      token: {
        $meta: "searchSequenceToken",
      },
    });
  });
});
