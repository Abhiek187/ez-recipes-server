import { FilterQuery, Types } from "mongoose";

import RecipeModel from "../models/RecipeModel";
import RecipeFilter, {
  RECIPE_SORT_FIELDS,
  RECIPE_SORT_MAP,
} from "../types/client/RecipeFilter";
import { Indexes, MAX_DOCS, filterRecipes } from "../utils/db";
import Recipe from "../types/client/Recipe";

const defaultSort = { _id: 1 };

describe("recipeFindQuery", () => {
  const mockExec = jest.fn();
  const mockLean = jest.fn().mockReturnValue({ exec: mockExec });
  const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
  const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
  const mockFind = jest.fn().mockReturnValue({ sort: mockSort });
  jest.spyOn(RecipeModel, "find").mockImplementation(mockFind);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("accepts no filter", async () => {
    // Given no filter
    // When filterRecipes is called
    await filterRecipes({});
    // Then the query is also empty
    expect(mockFind).toHaveBeenCalledWith({});
    expect(mockSort).toHaveBeenCalledWith(defaultSort);
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
    expect(mockSort).toHaveBeenCalledWith(defaultSort);
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
    expect(mockSort).toHaveBeenCalledWith(defaultSort);
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
    expect(mockSort).toHaveBeenCalledWith(defaultSort);
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
    expect(mockSort).toHaveBeenCalledWith(defaultSort);
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
    expect(mockSort).toHaveBeenCalledWith(defaultSort);
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
    expect(mockSort).toHaveBeenCalledWith(defaultSort);
    expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
  });

  it.each(RECIPE_SORT_FIELDS)(
    "sorts by %s in descending order",
    async (sortField) => {
      // Given a filter with a sort field
      const filter: Partial<RecipeFilter> = {
        sort: sortField,
      };

      // When filterRecipes is called
      await filterRecipes(filter);

      // Then the query is sorted in descending order by the correct field
      const expectedSort = {
        [RECIPE_SORT_MAP[sortField]]: -1,
        ...defaultSort,
      };
      expect(mockFind).toHaveBeenCalledWith({});
      expect(mockSort).toHaveBeenCalledWith(expectedSort);
      expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
    }
  );

  it.each(RECIPE_SORT_FIELDS)(
    "sorts by %s in ascending order",
    async (sortField) => {
      // Given a filter with a sort and asc field
      const filter: Partial<RecipeFilter> = {
        sort: sortField,
        asc: true,
      };

      // When filterRecipes is called
      await filterRecipes(filter);

      // Then the query is sorted in ascending order by the correct field
      const expectedSort = {
        [RECIPE_SORT_MAP[sortField]]: 1,
        ...defaultSort,
      };
      expect(mockFind).toHaveBeenCalledWith({});
      expect(mockSort).toHaveBeenCalledWith(expectedSort);
      expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
    }
  );

  it.each(RECIPE_SORT_FIELDS)(
    "sorts by %s in descending order with a compound token",
    async (sortField) => {
      // Given a filter with a sort and token field
      const mockToken = `${RECIPE_SORT_MAP[sortField]}:null:660f1af0b5ba9017ad8e5079`;
      const filter: Partial<RecipeFilter> = {
        sort: sortField,
        token: mockToken,
      };

      // When filterRecipes is called
      await filterRecipes(filter);

      // Then the query uses the compound token and is sorted in descending order
      const [expectedSortField, , expectedObjectId] = mockToken.split(":");
      const expectedQuery: FilterQuery<Recipe> = {
        $or: [
          {
            [expectedSortField]: null,
            _id: {
              $gt: new Types.ObjectId(expectedObjectId),
            },
          },
        ],
      };
      const expectedSort = {
        [RECIPE_SORT_MAP[sortField]]: -1,
        ...defaultSort,
      };
      expect(mockFind).toHaveBeenCalledWith(expectedQuery);
      expect(mockSort).toHaveBeenCalledWith(expectedSort);
      expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
    }
  );

  it.each(RECIPE_SORT_FIELDS)(
    "sorts by %s in ascending order with a compound token",
    async (sortField) => {
      // Given a filter with a sort, asc, and token field
      const mockToken = `${RECIPE_SORT_MAP[sortField]}:0:660f1af0b5ba9017ad8e5079`;
      const filter: Partial<RecipeFilter> = {
        sort: sortField,
        asc: true,
        token: mockToken,
      };

      // When filterRecipes is called
      await filterRecipes(filter);

      // Then the query uses the compound token and is sorted in ascending order
      const [expectedSortField, expectedLastValue, expectedObjectId] =
        mockToken.split(":");
      const expectedQuery: FilterQuery<Recipe> = {
        $or: [
          {
            [expectedSortField]: { $gt: Number(expectedLastValue) },
          },
          {
            [expectedSortField]: Number(expectedLastValue),
            _id: {
              $gt: new Types.ObjectId(expectedObjectId),
            },
          },
        ],
      };
      const expectedSort = {
        [RECIPE_SORT_MAP[sortField]]: 1,
        ...defaultSort,
      };
      expect(mockFind).toHaveBeenCalledWith(expectedQuery);
      expect(mockSort).toHaveBeenCalledWith(expectedSort);
      expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
    }
  );
});

describe("recipeAggregateQuery", () => {
  const mockExec = jest.fn();
  const mockAddFields = jest.fn().mockReturnValue({ exec: mockExec });
  const mockLimit = jest.fn().mockReturnValue({ addFields: mockAddFields });
  const mockProject = jest.fn().mockReturnValue({ limit: mockLimit });
  const mockSort = jest.fn().mockReturnValue({ project: mockProject });
  const mockAddFields2 = jest.fn().mockReturnValue({ sort: mockSort });
  const mockMatch = jest
    .fn()
    .mockReturnValue({ limit: mockLimit, addFields: mockAddFields2 });
  const mockSearch = jest.fn().mockReturnValue({
    match: mockMatch,
    addFields: mockAddFields2,
    limit: mockLimit,
  });
  const mockAggregate = jest.fn().mockReturnValue({ search: mockSearch });
  jest.spyOn(RecipeModel, "aggregate").mockImplementation(mockAggregate);

  const searchSort = { score: { $meta: "searchScore" }, ...defaultSort };
  const searchSortCalories = { score: -1, ...defaultSort };

  afterEach(() => {
    jest.clearAllMocks();
  });

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
      sort: searchSort,
    });
    expect(mockMatch).not.toHaveBeenCalled();
    expect(mockSort).not.toHaveBeenCalled();
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
      sort: searchSort,
    });
    expect(mockMatch).not.toHaveBeenCalled();
    expect(mockSort).not.toHaveBeenCalled();
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
      sort: searchSort,
    });
    expect(mockMatch).toHaveBeenCalledWith({
      isVegetarian: filter.vegetarian,
    });
    expect(mockSort).not.toHaveBeenCalled();
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
      sort: searchSort,
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
    expect(mockSort).not.toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
    expect(mockAddFields).toHaveBeenCalledWith({
      token: {
        $meta: "searchSequenceToken",
      },
    });
  });

  it("adds $sort when sorting by calories", async () => {
    // Given a recipe filter with a query and calories sort
    const filter: Partial<RecipeFilter> = {
      query: "tacos",
      sort: "calories",
    };

    // When filterRecipes is called
    await filterRecipes(filter);

    // Then the $search and $sort stages are used
    expect(mockSearch).toHaveBeenCalledWith({
      index: Indexes.RecipeName,
      text: {
        query: filter.query,
        path: {
          wildcard: "*",
        },
      },
    });
    expect(mockSort).toHaveBeenCalledWith({
      [RECIPE_SORT_MAP["calories"]]: -1,
      ...searchSortCalories,
    });
    expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
    expect(mockAddFields).toHaveBeenCalledWith({
      token: {
        $meta: "searchSequenceToken",
      },
    });
  });

  it("adds $match and $sort when sorting by calories with a compound token", async () => {
    // Given a recipe filter with a query, calories sort, and token
    const mockToken = `${RECIPE_SORT_MAP["calories"]}:null:660f1af0b5ba9017ad8e5079`;
    const filter: Partial<RecipeFilter> = {
      query: "tacos",
      sort: "calories",
      asc: true,
      token: mockToken,
    };

    // When filterRecipes is called
    await filterRecipes(filter);

    // Then the $search, $match, and $sort stages are used
    expect(mockSearch).toHaveBeenCalledWith({
      index: Indexes.RecipeName,
      text: {
        query: filter.query,
        path: {
          wildcard: "*",
        },
      },
    });
    const [expectedSortField, , expectedObjectId] = mockToken.split(":");
    expect(mockMatch).toHaveBeenCalledWith({
      $or: [
        {
          [expectedSortField]: { $gt: 0 },
        },
        {
          [expectedSortField]: null,
          _id: {
            $gt: new Types.ObjectId(expectedObjectId),
          },
        },
      ],
    });
    expect(mockSort).toHaveBeenCalledWith({
      [RECIPE_SORT_MAP["calories"]]: 1,
      ...searchSortCalories,
    });
    expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
    expect(mockAddFields).toHaveBeenCalledWith({
      token: {
        $meta: "searchSequenceToken",
      },
    });
  });

  it("adds sort to $search when sorting by simple fields", async () => {
    // Given a recipe filter with a query and calories sort
    const filter: Partial<RecipeFilter> = {
      query: "tacos",
      sort: "health-score",
    };

    // When filterRecipes is called
    await filterRecipes(filter);

    // Then the $search is used with sort
    expect(mockSearch).toHaveBeenCalledWith({
      index: Indexes.RecipeName,
      text: {
        query: filter.query,
        path: {
          wildcard: "*",
        },
      },
      sort: {
        [RECIPE_SORT_MAP["health-score"]]: -1,
        ...searchSort,
      },
    });
    expect(mockLimit).toHaveBeenCalledWith(MAX_DOCS);
    expect(mockAddFields).toHaveBeenCalledWith({
      token: {
        $meta: "searchSequenceToken",
      },
    });
  });
});
