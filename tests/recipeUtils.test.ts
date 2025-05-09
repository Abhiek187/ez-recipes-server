import { AxiosHeaders, AxiosResponse } from "axios";

import Recipe, {
  isValidCuisine,
  isValidMealType,
  isValidSpiceLevel,
} from "../types/client/Recipe";
import SearchResponse from "../types/spoonacular/SearchResponse";
import {
  createClientResponse,
  logSpoonacularQuota,
  randomRecipeUrlBuilder,
  recipeIdUrlBuilder,
  tasteUrlBuilder,
  sanitizeEnum,
  sanitizeEnumArray,
  sanitizeNumber,
} from "../utils/recipeUtils";
import * as recipeUtils from "../utils/recipeUtils";
import spoonacularApi from "../utils/api";

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

describe("sanitizeNumber", () => {
  it.each([
    [undefined, "undefined"],
    [null, "null"],
    [25, "25"],
    [true, "true"],
    [false, "false"],
    [[], "array"],
    [{}, "object"],
  ])(
    "should throw an error if param isn't a string or number",
    (param, name) => {
      expect(() => sanitizeNumber(param, name, 0, 0)).toThrow(
        `${name} is not numeric`
      );
    }
  );

  it.each(["number", "a100", "-3d", "NaN"])(
    "should throw an error if param isn't numeric",
    (param) => {
      expect(() => sanitizeNumber(param, param, 0, 0)).toThrow(
        `${param} is not numeric`
      );
    }
  );

  it.each([
    ["0", 1],
    ["-Infinity", 0],
  ])("should throw an error if param is under min", (param, min) => {
    expect(() => sanitizeNumber(param, param, min, Infinity)).toThrow(
      `${param} must be >= ${min}`
    );
  });

  it.each([
    ["0", -1],
    ["Infinity", 0],
  ])("should throw an error if param is over max", (param, max) => {
    expect(() => sanitizeNumber(param, param, -Infinity, max)).toThrow(
      `${param} must be <= ${max}`
    );
  });

  it.each([
    ["0", 0, 0, 0],
    ["-324", -324, -Infinity, Infinity],
    ["3.14", 3.14, 3, 4],
    ["6.2e9", 6.2e9, 0, Number.MAX_VALUE],
  ])("should return a number on success", (param, num, min, max) => {
    expect(sanitizeNumber(param, param.toString(), min, max)).toBe(num);
  });
});

describe("sanitizeEnum", () => {
  it("should validate letters in an array", () => {
    const validator = (str: string): str is string =>
      ["a", "b", "c"].includes(str);
    expect(sanitizeEnum("a", "letter", validator)).toBe("a");
    expect(() => sanitizeEnum("d", "letter", validator)).toThrow(
      "Unknown letter received: d"
    );
  });

  it("should validate spice levels", () => {
    expect(sanitizeEnum("none", "spice level", isValidSpiceLevel)).toBe("none");
    expect(() =>
      sanitizeEnum("unknown", "spice level", isValidSpiceLevel)
    ).toThrow("Unknown spice level received: unknown");
    expect(() => sanitizeEnum("hot", "spice level", isValidSpiceLevel)).toThrow(
      "Unknown spice level received: hot"
    );
  });

  it("should validate meal types", () => {
    expect(sanitizeEnum("hor d'oeuvre", "meal type", isValidMealType)).toBe(
      "hor d'oeuvre"
    );
    expect(() => sanitizeEnum("desert", "meal type", isValidMealType)).toThrow(
      "Unknown meal type received: desert"
    );
  });

  it("should validate cuisines", () => {
    expect(sanitizeEnum("Middle Eastern", "cuisine", isValidCuisine)).toBe(
      "Middle Eastern"
    );
    expect(() => sanitizeEnum("Canadian", "cuisine", isValidCuisine)).toThrow(
      "Unknown cuisine received: Canadian"
    );
  });
});

describe("sanitizeEnumArray", () => {
  it("should validate letters in an array", () => {
    const validator = (str: string): str is string =>
      ["a", "b", "c"].includes(str);
    expect(sanitizeEnumArray([], "letter", validator)).toStrictEqual([]);
    expect(
      sanitizeEnumArray(["a", "b", "c"], "letter", validator)
    ).toStrictEqual(["a", "b", "c"]);
    expect(() =>
      sanitizeEnumArray(["a", "d", "e"], "letter", validator)
    ).toThrow("Unknown letter received: d");
  });

  it("should validate spice levels", () => {
    expect(
      sanitizeEnumArray(["mild", "spicy"], "spice level", isValidSpiceLevel)
    ).toStrictEqual(["mild", "spicy"]);
    expect(() =>
      sanitizeEnumArray(["unknown", "none"], "spice level", isValidSpiceLevel)
    ).toThrow("Unknown spice level received: unknown");
  });

  it("should validate meal types", () => {
    expect(
      sanitizeEnumArray(
        ["main dish", "main course"],
        "meal type",
        isValidMealType
      )
    ).toStrictEqual(["main dish", "main course"]);
    expect(() =>
      sanitizeEnumArray(
        ["side dish", "side course"],
        "meal type",
        isValidMealType
      )
    ).toThrow("Unknown meal type received: side course");
  });

  it("should validate cuisines", () => {
    expect(
      sanitizeEnumArray(
        ["Spanish", "French", "German", "Italian"],
        "cuisine",
        isValidCuisine
      )
    ).toStrictEqual(["Spanish", "French", "German", "Italian"]);
    expect(() =>
      sanitizeEnumArray(["Nordic", "thai", "Jewish"], "cuisine", isValidCuisine)
    ).toThrow("Unknown cuisine received: thai");
  });
});

describe("randomRecipeUrlBuilder", () => {
  it("returns the correct random recipe URL & headers", () => {
    // Given query params like the API key
    // Mock the API key to prevent the real one from being leaked when tests fail
    process.env.API_KEY = "384ba039c39e90f";

    // When the URL builder method is called
    const recipeUrl = randomRecipeUrlBuilder();

    // Then it should return the correct spoonacular URL to fetch a random recipe
    expect(recipeUrl).toBe(
      "/complexSearch?instructionsRequired=true&addRecipeNutrition=true&maxReadyTime=60&sort=random&number=1"
    );
  });
});

describe("recipeIdUrlBuilder", () => {
  it("returns the correct URL with the recipe ID", () => {
    // Given an API key and a recipe ID
    process.env.API_KEY = "384ba039c39e90f";
    const recipeId = "8427";

    // When the URL builder method is called
    const recipeUrl = recipeIdUrlBuilder(recipeId);

    // Then it should return the correct spoonacular URL to fetch the recipe from recipeId
    expect(recipeUrl).toBe(
      `/${recipeId}/information?includeNutrition=true&addWinePairing=false&addTasteData=true`
    );
  });
});

describe("tasteUrlBuilder", () => {
  it("returns the correct URL with the recipe ID", () => {
    // Given an API key and a recipe ID
    process.env.API_KEY = "384ba039c39e90f";
    const recipeId = 8427;

    // When the URL builder method is called
    const recipeUrl = tasteUrlBuilder(recipeId);

    // Then it should return the correct spoonacular URL to fetch the recipe from recipeId
    expect(recipeUrl).toBe(`/${recipeId}/tasteWidget.json`);
  });
});

describe("logSpoonacularQuota", () => {
  it("logs the points used and the points remaining", () => {
    // Given a request & response with quota headers
    const mockRequest = {
      method: "GET",
      path: "/api/recipes/random",
    };
    const mockResponse: AxiosResponse<SearchResponse> = {
      headers: {
        "x-api-quota-request": "1.0599999999999998",
        "x-api-quota-used": "6.159999999999999",
        "x-api-quota-left": "143.84",
      },
      data: mockSearchResponse,
      status: 200,
      statusText: "",
      config: {
        headers: new AxiosHeaders(),
      },
    };

    // When the log method is called
    const logSpy = jest.spyOn(console, "log");
    logSpoonacularQuota(mockRequest.method, mockRequest.path, mockResponse);

    // Then it should output the number of points used from the request and the remaining/total points
    const requestQuota = Number(mockResponse.headers["x-api-quota-request"]);
    const usedQuota = Number(mockResponse.headers["x-api-quota-used"]);
    const remainingQuota = Number(mockResponse.headers["x-api-quota-left"]);

    expect(logSpy).toHaveBeenCalledWith(
      `${mockRequest.method} ${mockRequest.path} -${requestQuota} pts`
    );
    expect(logSpy).toHaveBeenCalledWith(
      `${remainingQuota} / ${usedQuota + remainingQuota} pts remaining`
    );
  });
});

describe("getSpiceLevel", () => {
  beforeEach(() => {
    jest
      .spyOn(recipeUtils, "logSpoonacularQuota")
      .mockImplementation(jest.fn());
  });

  it.each([
    [0, "none"],
    [100_000, "mild"],
    [1_000_000, "spicy"],
  ])(
    "associates a spice level of %d with %s",
    async (spiceValue: number, expectedSpiceLevel: string) => {
      jest.spyOn(spoonacularApi, "get").mockImplementation(() =>
        Promise.resolve({
          data: {
            sweetness: 48.35,
            saltiness: 45.48,
            sourness: 15.66,
            bitterness: 19.25,
            savoriness: 26.56,
            fattiness: 100,
            spiciness: spiceValue,
          },
        })
      );

      const actualSpiceLevel = await recipeUtils.getSpiceLevel(0);
      expect(actualSpiceLevel).toBe(expectedSpiceLevel);
    }
  );

  it("returns unknown if the API fails", async () => {
    jest
      .spyOn(spoonacularApi, "get")
      .mockImplementation(() => Promise.reject("GET taste mocked to fail"));

    const spiceLevel = await recipeUtils.getSpiceLevel(0);
    expect(spiceLevel).toBe("unknown");
  });
});

describe("createClientResponse", () => {
  beforeEach(() => {
    jest
      .spyOn(recipeUtils, "getSpiceLevel")
      .mockImplementation(() => Promise.resolve(expectedRecipe.spiceLevel));
  });

  it("creates the correct recipe object from a search response", async () => {
    // Given a search response
    // When the client response method is called
    const recipeResponse = await createClientResponse(mockSearchResponse);

    // Then it produces an accurate Recipe object for clients
    // Compare objects with deep equality
    expect(recipeResponse).toStrictEqual(expectedRecipe);
  });

  it("creates the correct recipe object from a recipe response", async () => {
    // Given a recipe response
    // When the client response method is called
    const recipeResponse = await createClientResponse(
      mockSearchResponse.results[0]
    );

    // Then it produces an accurate Recipe object for clients
    expect(recipeResponse).toStrictEqual(expectedRecipe);
  });
});

// Keep collapsed unless it's an emergency
export const mockSearchResponse: SearchResponse = {
  results: [
    {
      vegetarian: true,
      vegan: false,
      glutenFree: false,
      dairyFree: true,
      veryHealthy: false,
      cheap: false,
      veryPopular: false,
      sustainable: false,
      lowFodmap: false,
      weightWatcherSmartPoints: 12,
      gaps: "no",
      preparationMinutes: -1,
      cookingMinutes: -1,
      aggregateLikes: 1,
      healthScore: 36,
      creditsText: "Foodista.com – The Cooking Encyclopedia Everyone Can Edit",
      license: "CC BY 3.0",
      sourceName: "Foodista",
      pricePerServing: 243.49,
      id: 660475,
      title: "Snow Pea Sesame Noodle Salad",
      readyInMinutes: 45,
      servings: 8,
      sourceUrl:
        "http://www.foodista.com/recipe/GVH4JXJ2/snow-pea-sesame-noodle-salad",
      openLicense: -1,
      image: "https://img.spoonacular.com/recipes/660475-556x370.jpg",
      imageType: "jpg",
      nutrition: {
        nutrients: [
          {
            name: "Calories",
            amount: 440.55,
            unit: "kcal",
            percentOfDailyNeeds: 22.03,
          },
          {
            name: "Fat",
            amount: 21.23,
            unit: "g",
            percentOfDailyNeeds: 32.67,
          },
          {
            name: "Saturated Fat",
            amount: 3.39,
            unit: "g",
            percentOfDailyNeeds: 21.2,
          },
          {
            name: "Carbohydrates",
            amount: 54.73,
            unit: "g",
            percentOfDailyNeeds: 18.24,
          },
          {
            name: "Net Carbohydrates",
            amount: 51.53,
            unit: "g",
            percentOfDailyNeeds: 18.74,
          },
          {
            name: "Sugar",
            amount: 6.98,
            unit: "g",
            percentOfDailyNeeds: 7.76,
          },
          {
            name: "Cholesterol",
            amount: 0.0,
            unit: "mg",
            percentOfDailyNeeds: 0.0,
          },
          {
            name: "Sodium",
            amount: 77.61,
            unit: "mg",
            percentOfDailyNeeds: 3.37,
          },
          {
            name: "Protein",
            amount: 13.38,
            unit: "g",
            percentOfDailyNeeds: 26.76,
          },
          {
            name: "Manganese",
            amount: 2.17,
            unit: "mg",
            percentOfDailyNeeds: 108.43,
          },
          {
            name: "Vitamin C",
            amount: 75.48,
            unit: "mg",
            percentOfDailyNeeds: 91.49,
          },
          {
            name: "Selenium",
            amount: 43.5,
            unit: "µg",
            percentOfDailyNeeds: 62.14,
          },
          {
            name: "Vitamin K",
            amount: 59.14,
            unit: "µg",
            percentOfDailyNeeds: 56.32,
          },
          {
            name: "Vitamin A",
            amount: 1734.31,
            unit: "IU",
            percentOfDailyNeeds: 34.69,
          },
          {
            name: "Magnesium",
            amount: 129.48,
            unit: "mg",
            percentOfDailyNeeds: 32.37,
          },
          {
            name: "Vitamin B1",
            amount: 0.42,
            unit: "mg",
            percentOfDailyNeeds: 28.18,
          },
          {
            name: "Vitamin B3",
            amount: 5.18,
            unit: "mg",
            percentOfDailyNeeds: 25.91,
          },
          {
            name: "Phosphorus",
            amount: 244.62,
            unit: "mg",
            percentOfDailyNeeds: 24.46,
          },
          {
            name: "Copper",
            amount: 0.49,
            unit: "mg",
            percentOfDailyNeeds: 24.34,
          },
          {
            name: "Iron",
            amount: 4.21,
            unit: "mg",
            percentOfDailyNeeds: 23.37,
          },
          {
            name: "Folate",
            amount: 88.26,
            unit: "µg",
            percentOfDailyNeeds: 22.07,
          },
          {
            name: "Vitamin B6",
            amount: 0.39,
            unit: "mg",
            percentOfDailyNeeds: 19.56,
          },
          {
            name: "Zinc",
            amount: 2.13,
            unit: "mg",
            percentOfDailyNeeds: 14.23,
          },
          {
            name: "Vitamin E",
            amount: 2.09,
            unit: "mg",
            percentOfDailyNeeds: 13.96,
          },
          {
            name: "Fiber",
            amount: 3.2,
            unit: "g",
            percentOfDailyNeeds: 12.81,
          },
          {
            name: "Vitamin B5",
            amount: 1.21,
            unit: "mg",
            percentOfDailyNeeds: 12.12,
          },
          {
            name: "Potassium",
            amount: 403.98,
            unit: "mg",
            percentOfDailyNeeds: 11.54,
          },
          {
            name: "Vitamin B2",
            amount: 0.19,
            unit: "mg",
            percentOfDailyNeeds: 11.08,
          },
          {
            name: "Calcium",
            amount: 92.16,
            unit: "mg",
            percentOfDailyNeeds: 9.22,
          },
        ],
        properties: [
          {
            name: "Glycemic Index",
            amount: 38.41,
            unit: "",
          },
          {
            name: "Glycemic Load",
            amount: 2.07,
            unit: "",
          },
          {
            name: "Inflammation Score",
            amount: -9.0,
            unit: "",
          },
          {
            name: "Nutrition Score",
            amount: 27.385217391304348,
            unit: "%",
          },
        ],
        flavonoids: [
          {
            name: "Cyanidin",
            amount: 0.0,
            unit: "mg",
          },
          {
            name: "Petunidin",
            amount: 0.0,
            unit: "",
          },
          {
            name: "Delphinidin",
            amount: 0.0,
            unit: "",
          },
          {
            name: "Malvidin",
            amount: 0.0,
            unit: "",
          },
          {
            name: "Pelargonidin",
            amount: 0.0,
            unit: "",
          },
          {
            name: "Peonidin",
            amount: 0.0,
            unit: "",
          },
          {
            name: "Catechin",
            amount: 0.0,
            unit: "mg",
          },
          {
            name: "Epigallocatechin",
            amount: 0.0,
            unit: "mg",
          },
          {
            name: "Epicatechin",
            amount: 0.0,
            unit: "mg",
          },
          {
            name: "Epicatechin 3-gallate",
            amount: 0.0,
            unit: "mg",
          },
          {
            name: "Epigallocatechin 3-gallate",
            amount: 0.0,
            unit: "mg",
          },
          {
            name: "Theaflavin",
            amount: 0.0,
            unit: "",
          },
          {
            name: "Thearubigins",
            amount: 0.0,
            unit: "",
          },
          {
            name: "Eriodictyol",
            amount: 0.0,
            unit: "",
          },
          {
            name: "Hesperetin",
            amount: 0.0,
            unit: "mg",
          },
          {
            name: "Naringenin",
            amount: 0.0,
            unit: "",
          },
          {
            name: "Apigenin",
            amount: 3.23,
            unit: "mg",
          },
          {
            name: "Luteolin",
            amount: 0.2,
            unit: "mg",
          },
          {
            name: "Isorhamnetin",
            amount: 0.0,
            unit: "mg",
          },
          {
            name: "Kaempferol",
            amount: 0.11,
            unit: "mg",
          },
          {
            name: "Myricetin",
            amount: 0.23,
            unit: "mg",
          },
          {
            name: "Quercetin",
            amount: 0.73,
            unit: "mg",
          },
          {
            name: "Theaflavin-3,3'-digallate",
            amount: 0.0,
            unit: "",
          },
          {
            name: "Theaflavin-3'-gallate",
            amount: 0.0,
            unit: "",
          },
          {
            name: "Theaflavin-3-gallate",
            amount: 0.0,
            unit: "",
          },
          {
            name: "Gallocatechin",
            amount: 0.0,
            unit: "mg",
          },
        ],
        ingredients: [
          {
            id: 10211216,
            name: "ginger",
            amount: 0.13,
            unit: "teaspoon",
            nutrients: [
              {
                name: "Potassium",
                amount: 1.04,
                unit: "mg",
                percentOfDailyNeeds: 11.54,
              },
              {
                name: "Vitamin E",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 13.96,
              },
              {
                name: "Protein",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 26.76,
              },
              {
                name: "Phosphorus",
                amount: 0.09,
                unit: "mg",
                percentOfDailyNeeds: 24.46,
              },
              {
                name: "Vitamin B3",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 25.91,
              },
              {
                name: "Fiber",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 12.81,
              },
              {
                name: "Poly Unsaturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Folic Acid",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B5",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 12.12,
              },
              {
                name: "Vitamin D",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calcium",
                amount: 0.04,
                unit: "mg",
                percentOfDailyNeeds: 9.22,
              },
              {
                name: "Caffeine",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Sugar",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 7.76,
              },
              {
                name: "Mono Unsaturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calories",
                amount: 0.2,
                unit: "kcal",
                percentOfDailyNeeds: 22.03,
              },
              {
                name: "Vitamin A",
                amount: 0.0,
                unit: "IU",
                percentOfDailyNeeds: 34.69,
              },
              {
                name: "Vitamin C",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 91.49,
              },
              {
                name: "Saturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 21.2,
              },
              {
                name: "Iron",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 23.37,
              },
              {
                name: "Vitamin B12",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B1",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 28.18,
              },
              {
                name: "Cholesterol",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Alcohol",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Net Carbohydrates",
                amount: 0.04,
                unit: "g",
                percentOfDailyNeeds: 18.74,
              },
              {
                name: "Choline",
                amount: 0.07,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B6",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 19.56,
              },
              {
                name: "Carbohydrates",
                amount: 0.04,
                unit: "g",
                percentOfDailyNeeds: 18.24,
              },
              {
                name: "Manganese",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 108.43,
              },
              {
                name: "Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 32.67,
              },
              {
                name: "Vitamin K",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 56.32,
              },
              {
                name: "Vitamin B2",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 11.08,
              },
              {
                name: "Folate",
                amount: 0.03,
                unit: "µg",
                percentOfDailyNeeds: 22.07,
              },
              {
                name: "Magnesium",
                amount: 0.11,
                unit: "mg",
                percentOfDailyNeeds: 32.37,
              },
              {
                name: "Copper",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 24.34,
              },
              {
                name: "Sodium",
                amount: 0.03,
                unit: "mg",
                percentOfDailyNeeds: 3.37,
              },
              {
                name: "Zinc",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 14.23,
              },
              {
                name: "Selenium",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 62.14,
              },
              {
                name: "Lycopene",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
            ],
          },
          {
            id: 10511297,
            name: "parsley",
            amount: 0.38,
            unit: "tablespoons",
            nutrients: [
              {
                name: "Potassium",
                amount: 8.31,
                unit: "mg",
                percentOfDailyNeeds: 11.54,
              },
              {
                name: "Vitamin E",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 13.96,
              },
              {
                name: "Protein",
                amount: 0.04,
                unit: "g",
                percentOfDailyNeeds: 26.76,
              },
              {
                name: "Phosphorus",
                amount: 0.87,
                unit: "mg",
                percentOfDailyNeeds: 24.46,
              },
              {
                name: "Vitamin B3",
                amount: 0.02,
                unit: "mg",
                percentOfDailyNeeds: 25.91,
              },
              {
                name: "Fiber",
                amount: 0.05,
                unit: "g",
                percentOfDailyNeeds: 12.81,
              },
              {
                name: "Poly Unsaturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Folic Acid",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B5",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 12.12,
              },
              {
                name: "Vitamin D",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calcium",
                amount: 2.07,
                unit: "mg",
                percentOfDailyNeeds: 9.22,
              },
              {
                name: "Caffeine",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Sugar",
                amount: 0.01,
                unit: "g",
                percentOfDailyNeeds: 7.76,
              },
              {
                name: "Mono Unsaturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calories",
                amount: 0.54,
                unit: "kcal",
                percentOfDailyNeeds: 22.03,
              },
              {
                name: "Vitamin A",
                amount: 126.36,
                unit: "IU",
                percentOfDailyNeeds: 34.69,
              },
              {
                name: "Vitamin C",
                amount: 2.0,
                unit: "mg",
                percentOfDailyNeeds: 91.49,
              },
              {
                name: "Saturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 21.2,
              },
              {
                name: "Iron",
                amount: 0.09,
                unit: "mg",
                percentOfDailyNeeds: 23.37,
              },
              {
                name: "Vitamin B12",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B1",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 28.18,
              },
              {
                name: "Cholesterol",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Alcohol",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Net Carbohydrates",
                amount: 0.05,
                unit: "g",
                percentOfDailyNeeds: 18.74,
              },
              {
                name: "Choline",
                amount: 0.19,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B6",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 19.56,
              },
              {
                name: "Carbohydrates",
                amount: 0.09,
                unit: "g",
                percentOfDailyNeeds: 18.24,
              },
              {
                name: "Manganese",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 108.43,
              },
              {
                name: "Fat",
                amount: 0.01,
                unit: "g",
                percentOfDailyNeeds: 32.67,
              },
              {
                name: "Vitamin K",
                amount: 24.6,
                unit: "µg",
                percentOfDailyNeeds: 56.32,
              },
              {
                name: "Vitamin B2",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 11.08,
              },
              {
                name: "Folate",
                amount: 2.28,
                unit: "µg",
                percentOfDailyNeeds: 22.07,
              },
              {
                name: "Magnesium",
                amount: 0.75,
                unit: "mg",
                percentOfDailyNeeds: 32.37,
              },
              {
                name: "Copper",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 24.34,
              },
              {
                name: "Sodium",
                amount: 0.84,
                unit: "mg",
                percentOfDailyNeeds: 3.37,
              },
              {
                name: "Zinc",
                amount: 0.02,
                unit: "mg",
                percentOfDailyNeeds: 14.23,
              },
              {
                name: "Selenium",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 62.14,
              },
              {
                name: "Lycopene",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
            ],
          },
          {
            id: 10211215,
            name: "garlic cloves",
            amount: 0.25,
            unit: "",
            nutrients: [
              {
                name: "Potassium",
                amount: 3.01,
                unit: "mg",
                percentOfDailyNeeds: 11.54,
              },
              {
                name: "Vitamin E",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 13.96,
              },
              {
                name: "Protein",
                amount: 0.05,
                unit: "g",
                percentOfDailyNeeds: 26.76,
              },
              {
                name: "Phosphorus",
                amount: 1.15,
                unit: "mg",
                percentOfDailyNeeds: 24.46,
              },
              {
                name: "Vitamin B3",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 25.91,
              },
              {
                name: "Fiber",
                amount: 0.02,
                unit: "g",
                percentOfDailyNeeds: 12.81,
              },
              {
                name: "Poly Unsaturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Folic Acid",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B5",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 12.12,
              },
              {
                name: "Vitamin D",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calcium",
                amount: 1.36,
                unit: "mg",
                percentOfDailyNeeds: 9.22,
              },
              {
                name: "Caffeine",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Sugar",
                amount: 0.01,
                unit: "g",
                percentOfDailyNeeds: 7.76,
              },
              {
                name: "Mono Unsaturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calories",
                amount: 1.12,
                unit: "kcal",
                percentOfDailyNeeds: 22.03,
              },
              {
                name: "Vitamin A",
                amount: 0.07,
                unit: "IU",
                percentOfDailyNeeds: 34.69,
              },
              {
                name: "Vitamin C",
                amount: 0.23,
                unit: "mg",
                percentOfDailyNeeds: 91.49,
              },
              {
                name: "Saturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 21.2,
              },
              {
                name: "Iron",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 23.37,
              },
              {
                name: "Vitamin B12",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B1",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 28.18,
              },
              {
                name: "Cholesterol",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Alcohol",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Net Carbohydrates",
                amount: 0.23,
                unit: "g",
                percentOfDailyNeeds: 18.74,
              },
              {
                name: "Choline",
                amount: 0.17,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B6",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 19.56,
              },
              {
                name: "Carbohydrates",
                amount: 0.25,
                unit: "g",
                percentOfDailyNeeds: 18.24,
              },
              {
                name: "Manganese",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 108.43,
              },
              {
                name: "Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 32.67,
              },
              {
                name: "Vitamin K",
                amount: 0.01,
                unit: "µg",
                percentOfDailyNeeds: 56.32,
              },
              {
                name: "Vitamin B2",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 11.08,
              },
              {
                name: "Folate",
                amount: 0.02,
                unit: "µg",
                percentOfDailyNeeds: 22.07,
              },
              {
                name: "Magnesium",
                amount: 0.19,
                unit: "mg",
                percentOfDailyNeeds: 32.37,
              },
              {
                name: "Copper",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 24.34,
              },
              {
                name: "Sodium",
                amount: 0.13,
                unit: "mg",
                percentOfDailyNeeds: 3.37,
              },
              {
                name: "Zinc",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 14.23,
              },
              {
                name: "Selenium",
                amount: 0.11,
                unit: "µg",
                percentOfDailyNeeds: 62.14,
              },
              {
                name: "Lycopene",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
            ],
          },
          {
            id: 19296,
            name: "honey",
            amount: 0.13,
            unit: "tablespoon",
            nutrients: [
              {
                name: "Potassium",
                amount: 1.37,
                unit: "mg",
                percentOfDailyNeeds: 11.54,
              },
              {
                name: "Vitamin E",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 13.96,
              },
              {
                name: "Protein",
                amount: 0.01,
                unit: "g",
                percentOfDailyNeeds: 26.76,
              },
              {
                name: "Phosphorus",
                amount: 0.1,
                unit: "mg",
                percentOfDailyNeeds: 24.46,
              },
              {
                name: "Vitamin B3",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 25.91,
              },
              {
                name: "Fluoride",
                amount: 0.18,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Fiber",
                amount: 0.01,
                unit: "g",
                percentOfDailyNeeds: 12.81,
              },
              {
                name: "Poly Unsaturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Folic Acid",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B5",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 12.12,
              },
              {
                name: "Vitamin D",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calcium",
                amount: 0.16,
                unit: "mg",
                percentOfDailyNeeds: 9.22,
              },
              {
                name: "Caffeine",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Sugar",
                amount: 2.16,
                unit: "g",
                percentOfDailyNeeds: 7.76,
              },
              {
                name: "Mono Unsaturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calories",
                amount: 7.98,
                unit: "kcal",
                percentOfDailyNeeds: 22.03,
              },
              {
                name: "Vitamin A",
                amount: 0.0,
                unit: "IU",
                percentOfDailyNeeds: 34.69,
              },
              {
                name: "Vitamin C",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 91.49,
              },
              {
                name: "Saturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 21.2,
              },
              {
                name: "Iron",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 23.37,
              },
              {
                name: "Vitamin B12",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B1",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 28.18,
              },
              {
                name: "Cholesterol",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Alcohol",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Net Carbohydrates",
                amount: 2.16,
                unit: "g",
                percentOfDailyNeeds: 18.74,
              },
              {
                name: "Choline",
                amount: 0.06,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B6",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 19.56,
              },
              {
                name: "Carbohydrates",
                amount: 2.16,
                unit: "g",
                percentOfDailyNeeds: 18.24,
              },
              {
                name: "Manganese",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 108.43,
              },
              {
                name: "Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 32.67,
              },
              {
                name: "Vitamin K",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 56.32,
              },
              {
                name: "Vitamin B2",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 11.08,
              },
              {
                name: "Folate",
                amount: 0.05,
                unit: "µg",
                percentOfDailyNeeds: 22.07,
              },
              {
                name: "Magnesium",
                amount: 0.05,
                unit: "mg",
                percentOfDailyNeeds: 32.37,
              },
              {
                name: "Copper",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 24.34,
              },
              {
                name: "Sodium",
                amount: 0.1,
                unit: "mg",
                percentOfDailyNeeds: 3.37,
              },
              {
                name: "Zinc",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 14.23,
              },
              {
                name: "Selenium",
                amount: 0.02,
                unit: "µg",
                percentOfDailyNeeds: 62.14,
              },
              {
                name: "Lycopene",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
            ],
          },
          {
            id: 11821,
            name: "bell peppers",
            amount: 0.25,
            unit: "",
            nutrients: [
              {
                name: "Potassium",
                amount: 62.77,
                unit: "mg",
                percentOfDailyNeeds: 11.54,
              },
              {
                name: "Vitamin E",
                amount: 0.47,
                unit: "mg",
                percentOfDailyNeeds: 13.96,
              },
              {
                name: "Protein",
                amount: 0.29,
                unit: "g",
                percentOfDailyNeeds: 26.76,
              },
              {
                name: "Phosphorus",
                amount: 7.74,
                unit: "mg",
                percentOfDailyNeeds: 24.46,
              },
              {
                name: "Vitamin B3",
                amount: 0.29,
                unit: "mg",
                percentOfDailyNeeds: 25.91,
              },
              {
                name: "Fiber",
                amount: 0.62,
                unit: "g",
                percentOfDailyNeeds: 12.81,
              },
              {
                name: "Poly Unsaturated Fat",
                amount: 0.05,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Folic Acid",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B5",
                amount: 0.09,
                unit: "mg",
                percentOfDailyNeeds: 12.12,
              },
              {
                name: "Vitamin D",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calcium",
                amount: 2.08,
                unit: "mg",
                percentOfDailyNeeds: 9.22,
              },
              {
                name: "Caffeine",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Sugar",
                amount: 1.25,
                unit: "g",
                percentOfDailyNeeds: 7.76,
              },
              {
                name: "Mono Unsaturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calories",
                amount: 7.74,
                unit: "kcal",
                percentOfDailyNeeds: 22.03,
              },
              {
                name: "Vitamin A",
                amount: 931.47,
                unit: "IU",
                percentOfDailyNeeds: 34.69,
              },
              {
                name: "Vitamin C",
                amount: 38.08,
                unit: "mg",
                percentOfDailyNeeds: 91.49,
              },
              {
                name: "Saturated Fat",
                amount: 0.02,
                unit: "g",
                percentOfDailyNeeds: 21.2,
              },
              {
                name: "Iron",
                amount: 0.13,
                unit: "mg",
                percentOfDailyNeeds: 23.37,
              },
              {
                name: "Vitamin B12",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B1",
                amount: 0.02,
                unit: "mg",
                percentOfDailyNeeds: 28.18,
              },
              {
                name: "Cholesterol",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Alcohol",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Net Carbohydrates",
                amount: 1.17,
                unit: "g",
                percentOfDailyNeeds: 18.74,
              },
              {
                name: "Choline",
                amount: 1.67,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B6",
                amount: 0.09,
                unit: "mg",
                percentOfDailyNeeds: 19.56,
              },
              {
                name: "Carbohydrates",
                amount: 1.79,
                unit: "g",
                percentOfDailyNeeds: 18.24,
              },
              {
                name: "Manganese",
                amount: 0.03,
                unit: "mg",
                percentOfDailyNeeds: 108.43,
              },
              {
                name: "Fat",
                amount: 0.09,
                unit: "g",
                percentOfDailyNeeds: 32.67,
              },
              {
                name: "Vitamin K",
                amount: 1.46,
                unit: "µg",
                percentOfDailyNeeds: 56.32,
              },
              {
                name: "Vitamin B2",
                amount: 0.03,
                unit: "mg",
                percentOfDailyNeeds: 11.08,
              },
              {
                name: "Folate",
                amount: 13.69,
                unit: "µg",
                percentOfDailyNeeds: 22.07,
              },
              {
                name: "Magnesium",
                amount: 3.57,
                unit: "mg",
                percentOfDailyNeeds: 32.37,
              },
              {
                name: "Copper",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 24.34,
              },
              {
                name: "Sodium",
                amount: 1.19,
                unit: "mg",
                percentOfDailyNeeds: 3.37,
              },
              {
                name: "Zinc",
                amount: 0.07,
                unit: "mg",
                percentOfDailyNeeds: 14.23,
              },
              {
                name: "Selenium",
                amount: 0.03,
                unit: "µg",
                percentOfDailyNeeds: 62.14,
              },
              {
                name: "Lycopene",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
            ],
          },
          {
            id: 1022053,
            name: "rice wine vinegar",
            amount: 0.03,
            unit: "cup",
            nutrients: [
              {
                name: "Potassium",
                amount: 0.16,
                unit: "mg",
                percentOfDailyNeeds: 11.54,
              },
              {
                name: "Vitamin E",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 13.96,
              },
              {
                name: "Protein",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 26.76,
              },
              {
                name: "Phosphorus",
                amount: 0.32,
                unit: "mg",
                percentOfDailyNeeds: 24.46,
              },
              {
                name: "Vitamin B3",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 25.91,
              },
              {
                name: "Fiber",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 12.81,
              },
              {
                name: "Poly Unsaturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Folic Acid",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B5",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 12.12,
              },
              {
                name: "Vitamin D",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calcium",
                amount: 0.48,
                unit: "mg",
                percentOfDailyNeeds: 9.22,
              },
              {
                name: "Caffeine",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Sugar",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 7.76,
              },
              {
                name: "Mono Unsaturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calories",
                amount: 1.43,
                unit: "kcal",
                percentOfDailyNeeds: 22.03,
              },
              {
                name: "Vitamin A",
                amount: 0.0,
                unit: "IU",
                percentOfDailyNeeds: 34.69,
              },
              {
                name: "Vitamin C",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 91.49,
              },
              {
                name: "Saturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 21.2,
              },
              {
                name: "Trans Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 184.75,
              },
              {
                name: "Iron",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 23.37,
              },
              {
                name: "Vitamin B12",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B1",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 28.18,
              },
              {
                name: "Cholesterol",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Alcohol",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Net Carbohydrates",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 18.74,
              },
              {
                name: "Choline",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B6",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 19.56,
              },
              {
                name: "Carbohydrates",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 18.24,
              },
              {
                name: "Manganese",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 108.43,
              },
              {
                name: "Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 32.67,
              },
              {
                name: "Vitamin K",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 56.32,
              },
              {
                name: "Vitamin B2",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 11.08,
              },
              {
                name: "Folate",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 22.07,
              },
              {
                name: "Magnesium",
                amount: 0.08,
                unit: "mg",
                percentOfDailyNeeds: 32.37,
              },
              {
                name: "Copper",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 24.34,
              },
              {
                name: "Sodium",
                amount: 0.16,
                unit: "mg",
                percentOfDailyNeeds: 3.37,
              },
              {
                name: "Zinc",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 14.23,
              },
              {
                name: "Selenium",
                amount: 0.04,
                unit: "µg",
                percentOfDailyNeeds: 62.14,
              },
              {
                name: "Lycopene",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
            ],
          },
          {
            id: 11291,
            name: "scallions",
            amount: 0.5,
            unit: "stalks",
            nutrients: [
              {
                name: "Potassium",
                amount: 16.56,
                unit: "mg",
                percentOfDailyNeeds: 11.54,
              },
              {
                name: "Vitamin E",
                amount: 0.03,
                unit: "mg",
                percentOfDailyNeeds: 13.96,
              },
              {
                name: "Protein",
                amount: 0.11,
                unit: "g",
                percentOfDailyNeeds: 26.76,
              },
              {
                name: "Phosphorus",
                amount: 2.22,
                unit: "mg",
                percentOfDailyNeeds: 24.46,
              },
              {
                name: "Vitamin B3",
                amount: 0.03,
                unit: "mg",
                percentOfDailyNeeds: 25.91,
              },
              {
                name: "Fiber",
                amount: 0.16,
                unit: "g",
                percentOfDailyNeeds: 12.81,
              },
              {
                name: "Poly Unsaturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Folic Acid",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B5",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 12.12,
              },
              {
                name: "Vitamin D",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calcium",
                amount: 4.32,
                unit: "mg",
                percentOfDailyNeeds: 9.22,
              },
              {
                name: "Caffeine",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Sugar",
                amount: 0.14,
                unit: "g",
                percentOfDailyNeeds: 7.76,
              },
              {
                name: "Mono Unsaturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calories",
                amount: 1.92,
                unit: "kcal",
                percentOfDailyNeeds: 22.03,
              },
              {
                name: "Vitamin A",
                amount: 59.82,
                unit: "IU",
                percentOfDailyNeeds: 34.69,
              },
              {
                name: "Vitamin C",
                amount: 1.13,
                unit: "mg",
                percentOfDailyNeeds: 91.49,
              },
              {
                name: "Saturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 21.2,
              },
              {
                name: "Iron",
                amount: 0.09,
                unit: "mg",
                percentOfDailyNeeds: 23.37,
              },
              {
                name: "Vitamin B12",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B1",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 28.18,
              },
              {
                name: "Cholesterol",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Alcohol",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Net Carbohydrates",
                amount: 0.28,
                unit: "g",
                percentOfDailyNeeds: 18.74,
              },
              {
                name: "Choline",
                amount: 0.34,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B6",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 19.56,
              },
              {
                name: "Carbohydrates",
                amount: 0.44,
                unit: "g",
                percentOfDailyNeeds: 18.24,
              },
              {
                name: "Manganese",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 108.43,
              },
              {
                name: "Fat",
                amount: 0.01,
                unit: "g",
                percentOfDailyNeeds: 32.67,
              },
              {
                name: "Vitamin K",
                amount: 12.42,
                unit: "µg",
                percentOfDailyNeeds: 56.32,
              },
              {
                name: "Vitamin B2",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 11.08,
              },
              {
                name: "Folate",
                amount: 3.84,
                unit: "µg",
                percentOfDailyNeeds: 22.07,
              },
              {
                name: "Magnesium",
                amount: 1.2,
                unit: "mg",
                percentOfDailyNeeds: 32.37,
              },
              {
                name: "Copper",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 24.34,
              },
              {
                name: "Sodium",
                amount: 0.96,
                unit: "mg",
                percentOfDailyNeeds: 3.37,
              },
              {
                name: "Zinc",
                amount: 0.02,
                unit: "mg",
                percentOfDailyNeeds: 14.23,
              },
              {
                name: "Selenium",
                amount: 0.04,
                unit: "µg",
                percentOfDailyNeeds: 62.14,
              },
              {
                name: "Lycopene",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
            ],
          },
          {
            id: 4058,
            name: "sesame oil",
            amount: 0.75,
            unit: "tablespoons",
            nutrients: [
              {
                name: "Potassium",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 11.54,
              },
              {
                name: "Vitamin E",
                amount: 0.15,
                unit: "mg",
                percentOfDailyNeeds: 13.96,
              },
              {
                name: "Protein",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 26.76,
              },
              {
                name: "Phosphorus",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 24.46,
              },
              {
                name: "Vitamin B3",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 25.91,
              },
              {
                name: "Fiber",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 12.81,
              },
              {
                name: "Poly Unsaturated Fat",
                amount: 4.38,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Folic Acid",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B5",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 12.12,
              },
              {
                name: "Vitamin D",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calcium",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 9.22,
              },
              {
                name: "Caffeine",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Sugar",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 7.76,
              },
              {
                name: "Mono Unsaturated Fat",
                amount: 4.17,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calories",
                amount: 92.82,
                unit: "kcal",
                percentOfDailyNeeds: 22.03,
              },
              {
                name: "Vitamin A",
                amount: 0.0,
                unit: "IU",
                percentOfDailyNeeds: 34.69,
              },
              {
                name: "Vitamin C",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 91.49,
              },
              {
                name: "Saturated Fat",
                amount: 1.49,
                unit: "g",
                percentOfDailyNeeds: 21.2,
              },
              {
                name: "Iron",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 23.37,
              },
              {
                name: "Vitamin B12",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B1",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 28.18,
              },
              {
                name: "Cholesterol",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Alcohol",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Net Carbohydrates",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 18.74,
              },
              {
                name: "Choline",
                amount: 0.02,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B6",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 19.56,
              },
              {
                name: "Carbohydrates",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 18.24,
              },
              {
                name: "Fat",
                amount: 10.5,
                unit: "g",
                percentOfDailyNeeds: 32.67,
              },
              {
                name: "Vitamin K",
                amount: 1.43,
                unit: "µg",
                percentOfDailyNeeds: 56.32,
              },
              {
                name: "Vitamin B2",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 11.08,
              },
              {
                name: "Folate",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 22.07,
              },
              {
                name: "Magnesium",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 32.37,
              },
              {
                name: "Copper",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 24.34,
              },
              {
                name: "Sodium",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 3.37,
              },
              {
                name: "Zinc",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 14.23,
              },
              {
                name: "Selenium",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 62.14,
              },
              {
                name: "Lycopene",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
            ],
          },
          {
            id: 10116098,
            name: "smooth peanut butter",
            amount: 0.04,
            unit: "cup",
            nutrients: [
              {
                name: "Potassium",
                amount: 60.63,
                unit: "mg",
                percentOfDailyNeeds: 11.54,
              },
              {
                name: "Vitamin E",
                amount: 0.98,
                unit: "mg",
                percentOfDailyNeeds: 13.96,
              },
              {
                name: "Protein",
                amount: 2.42,
                unit: "g",
                percentOfDailyNeeds: 26.76,
              },
              {
                name: "Phosphorus",
                amount: 36.44,
                unit: "mg",
                percentOfDailyNeeds: 24.46,
              },
              {
                name: "Vitamin B3",
                amount: 1.43,
                unit: "mg",
                percentOfDailyNeeds: 25.91,
              },
              {
                name: "Fluoride",
                amount: 0.33,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Fiber",
                amount: 0.52,
                unit: "g",
                percentOfDailyNeeds: 12.81,
              },
              {
                name: "Poly Unsaturated Fat",
                amount: 1.32,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Folic Acid",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B5",
                amount: 0.11,
                unit: "mg",
                percentOfDailyNeeds: 12.12,
              },
              {
                name: "Vitamin D",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calcium",
                amount: 5.27,
                unit: "mg",
                percentOfDailyNeeds: 9.22,
              },
              {
                name: "Caffeine",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Sugar",
                amount: 1.13,
                unit: "g",
                percentOfDailyNeeds: 7.76,
              },
              {
                name: "Mono Unsaturated Fat",
                amount: 2.73,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calories",
                amount: 64.18,
                unit: "kcal",
                percentOfDailyNeeds: 22.03,
              },
              {
                name: "Vitamin A",
                amount: 0.0,
                unit: "IU",
                percentOfDailyNeeds: 34.69,
              },
              {
                name: "Vitamin C",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 91.49,
              },
              {
                name: "Saturated Fat",
                amount: 1.09,
                unit: "g",
                percentOfDailyNeeds: 21.2,
              },
              {
                name: "Iron",
                amount: 0.19,
                unit: "mg",
                percentOfDailyNeeds: 23.37,
              },
              {
                name: "Vitamin B12",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B1",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 28.18,
              },
              {
                name: "Cholesterol",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Alcohol",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Net Carbohydrates",
                amount: 1.88,
                unit: "g",
                percentOfDailyNeeds: 18.74,
              },
              {
                name: "Choline",
                amount: 6.77,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B6",
                amount: 0.05,
                unit: "mg",
                percentOfDailyNeeds: 19.56,
              },
              {
                name: "Carbohydrates",
                amount: 2.4,
                unit: "g",
                percentOfDailyNeeds: 18.24,
              },
              {
                name: "Manganese",
                amount: 0.16,
                unit: "mg",
                percentOfDailyNeeds: 108.43,
              },
              {
                name: "Fat",
                amount: 5.49,
                unit: "g",
                percentOfDailyNeeds: 32.67,
              },
              {
                name: "Vitamin K",
                amount: 0.03,
                unit: "µg",
                percentOfDailyNeeds: 56.32,
              },
              {
                name: "Vitamin B2",
                amount: 0.02,
                unit: "mg",
                percentOfDailyNeeds: 11.08,
              },
              {
                name: "Folate",
                amount: 9.24,
                unit: "µg",
                percentOfDailyNeeds: 22.07,
              },
              {
                name: "Magnesium",
                amount: 18.17,
                unit: "mg",
                percentOfDailyNeeds: 32.37,
              },
              {
                name: "Copper",
                amount: 0.05,
                unit: "mg",
                percentOfDailyNeeds: 24.34,
              },
              {
                name: "Sodium",
                amount: 46.12,
                unit: "mg",
                percentOfDailyNeeds: 3.37,
              },
              {
                name: "Zinc",
                amount: 0.27,
                unit: "mg",
                percentOfDailyNeeds: 14.23,
              },
              {
                name: "Selenium",
                amount: 0.44,
                unit: "µg",
                percentOfDailyNeeds: 62.14,
              },
              {
                name: "Lycopene",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
            ],
          },
          {
            id: 11300,
            name: "snow peas",
            amount: 0.13,
            unit: "pound",
            nutrients: [
              {
                name: "Potassium",
                amount: 113.4,
                unit: "mg",
                percentOfDailyNeeds: 11.54,
              },
              {
                name: "Vitamin E",
                amount: 0.22,
                unit: "mg",
                percentOfDailyNeeds: 13.96,
              },
              {
                name: "Protein",
                amount: 1.59,
                unit: "g",
                percentOfDailyNeeds: 26.76,
              },
              {
                name: "Phosphorus",
                amount: 30.05,
                unit: "mg",
                percentOfDailyNeeds: 24.46,
              },
              {
                name: "Vitamin B3",
                amount: 0.34,
                unit: "mg",
                percentOfDailyNeeds: 25.91,
              },
              {
                name: "Fiber",
                amount: 1.47,
                unit: "g",
                percentOfDailyNeeds: 12.81,
              },
              {
                name: "Poly Unsaturated Fat",
                amount: 0.05,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Folic Acid",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B5",
                amount: 0.43,
                unit: "mg",
                percentOfDailyNeeds: 12.12,
              },
              {
                name: "Vitamin D",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calcium",
                amount: 24.38,
                unit: "mg",
                percentOfDailyNeeds: 9.22,
              },
              {
                name: "Caffeine",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Sugar",
                amount: 2.27,
                unit: "g",
                percentOfDailyNeeds: 7.76,
              },
              {
                name: "Mono Unsaturated Fat",
                amount: 0.01,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calories",
                amount: 23.81,
                unit: "kcal",
                percentOfDailyNeeds: 22.03,
              },
              {
                name: "Vitamin A",
                amount: 616.32,
                unit: "IU",
                percentOfDailyNeeds: 34.69,
              },
              {
                name: "Vitamin C",
                amount: 34.02,
                unit: "mg",
                percentOfDailyNeeds: 91.49,
              },
              {
                name: "Saturated Fat",
                amount: 0.02,
                unit: "g",
                percentOfDailyNeeds: 21.2,
              },
              {
                name: "Iron",
                amount: 1.18,
                unit: "mg",
                percentOfDailyNeeds: 23.37,
              },
              {
                name: "Vitamin B12",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B1",
                amount: 0.09,
                unit: "mg",
                percentOfDailyNeeds: 28.18,
              },
              {
                name: "Cholesterol",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Alcohol",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Net Carbohydrates",
                amount: 2.81,
                unit: "g",
                percentOfDailyNeeds: 18.74,
              },
              {
                name: "Choline",
                amount: 9.87,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B6",
                amount: 0.09,
                unit: "mg",
                percentOfDailyNeeds: 19.56,
              },
              {
                name: "Carbohydrates",
                amount: 4.28,
                unit: "g",
                percentOfDailyNeeds: 18.24,
              },
              {
                name: "Manganese",
                amount: 0.14,
                unit: "mg",
                percentOfDailyNeeds: 108.43,
              },
              {
                name: "Fat",
                amount: 0.11,
                unit: "g",
                percentOfDailyNeeds: 32.67,
              },
              {
                name: "Vitamin K",
                amount: 14.17,
                unit: "µg",
                percentOfDailyNeeds: 56.32,
              },
              {
                name: "Vitamin B2",
                amount: 0.05,
                unit: "mg",
                percentOfDailyNeeds: 11.08,
              },
              {
                name: "Folate",
                amount: 23.81,
                unit: "µg",
                percentOfDailyNeeds: 22.07,
              },
              {
                name: "Magnesium",
                amount: 13.61,
                unit: "mg",
                percentOfDailyNeeds: 32.37,
              },
              {
                name: "Copper",
                amount: 0.04,
                unit: "mg",
                percentOfDailyNeeds: 24.34,
              },
              {
                name: "Sodium",
                amount: 2.27,
                unit: "mg",
                percentOfDailyNeeds: 3.37,
              },
              {
                name: "Zinc",
                amount: 0.15,
                unit: "mg",
                percentOfDailyNeeds: 14.23,
              },
              {
                name: "Selenium",
                amount: 0.4,
                unit: "µg",
                percentOfDailyNeeds: 62.14,
              },
              {
                name: "Lycopene",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
            ],
          },
          {
            id: 16124,
            name: "soy sauce",
            amount: 0.06,
            unit: "teaspoon",
            nutrients: [
              {
                name: "Potassium",
                amount: 0.8,
                unit: "mg",
                percentOfDailyNeeds: 11.54,
              },
              {
                name: "Vitamin E",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 13.96,
              },
              {
                name: "Protein",
                amount: 0.04,
                unit: "g",
                percentOfDailyNeeds: 26.76,
              },
              {
                name: "Phosphorus",
                amount: 0.49,
                unit: "mg",
                percentOfDailyNeeds: 24.46,
              },
              {
                name: "Vitamin B3",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 25.91,
              },
              {
                name: "Fiber",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 12.81,
              },
              {
                name: "Poly Unsaturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Folic Acid",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B5",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 12.12,
              },
              {
                name: "Vitamin D",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calcium",
                amount: 0.08,
                unit: "mg",
                percentOfDailyNeeds: 9.22,
              },
              {
                name: "Caffeine",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Sugar",
                amount: 0.01,
                unit: "g",
                percentOfDailyNeeds: 7.76,
              },
              {
                name: "Mono Unsaturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calories",
                amount: 0.22,
                unit: "kcal",
                percentOfDailyNeeds: 22.03,
              },
              {
                name: "Vitamin A",
                amount: 0.0,
                unit: "IU",
                percentOfDailyNeeds: 34.69,
              },
              {
                name: "Vitamin C",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 91.49,
              },
              {
                name: "Saturated Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 21.2,
              },
              {
                name: "Iron",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 23.37,
              },
              {
                name: "Vitamin B12",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B1",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 28.18,
              },
              {
                name: "Cholesterol",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Alcohol",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Net Carbohydrates",
                amount: 0.02,
                unit: "g",
                percentOfDailyNeeds: 18.74,
              },
              {
                name: "Choline",
                amount: 0.14,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B6",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 19.56,
              },
              {
                name: "Carbohydrates",
                amount: 0.02,
                unit: "g",
                percentOfDailyNeeds: 18.24,
              },
              {
                name: "Manganese",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 108.43,
              },
              {
                name: "Fat",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 32.67,
              },
              {
                name: "Vitamin K",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 56.32,
              },
              {
                name: "Vitamin B2",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 11.08,
              },
              {
                name: "Folate",
                amount: 0.07,
                unit: "µg",
                percentOfDailyNeeds: 22.07,
              },
              {
                name: "Magnesium",
                amount: 0.15,
                unit: "mg",
                percentOfDailyNeeds: 32.37,
              },
              {
                name: "Copper",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 24.34,
              },
              {
                name: "Sodium",
                amount: 20.95,
                unit: "mg",
                percentOfDailyNeeds: 3.37,
              },
              {
                name: "Zinc",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 14.23,
              },
              {
                name: "Selenium",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 62.14,
              },
              {
                name: "Lycopene",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
            ],
          },
          {
            id: 4669,
            name: "vegetable oil",
            amount: 0.06,
            unit: "cup",
            nutrients: [
              {
                name: "Potassium",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 11.54,
              },
              {
                name: "Vitamin E",
                amount: 1.11,
                unit: "mg",
                percentOfDailyNeeds: 13.96,
              },
              {
                name: "Protein",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 26.76,
              },
              {
                name: "Phosphorus",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 24.46,
              },
              {
                name: "Vitamin B3",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 25.91,
              },
              {
                name: "Fiber",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 12.81,
              },
              {
                name: "Poly Unsaturated Fat",
                amount: 7.81,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Folic Acid",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B5",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 12.12,
              },
              {
                name: "Calcium",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 9.22,
              },
              {
                name: "Caffeine",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Sugar",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 7.76,
              },
              {
                name: "Mono Unsaturated Fat",
                amount: 3.1,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calories",
                amount: 120.44,
                unit: "kcal",
                percentOfDailyNeeds: 22.03,
              },
              {
                name: "Vitamin A",
                amount: 0.0,
                unit: "IU",
                percentOfDailyNeeds: 34.69,
              },
              {
                name: "Vitamin C",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 91.49,
              },
              {
                name: "Saturated Fat",
                amount: 2.08,
                unit: "g",
                percentOfDailyNeeds: 21.2,
              },
              {
                name: "Trans Fat",
                amount: 0.09,
                unit: "g",
                percentOfDailyNeeds: 184.75,
              },
              {
                name: "Iron",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 23.37,
              },
              {
                name: "Vitamin B12",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B1",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 28.18,
              },
              {
                name: "Cholesterol",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Alcohol",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Net Carbohydrates",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 18.74,
              },
              {
                name: "Choline",
                amount: 0.03,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B6",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 19.56,
              },
              {
                name: "Carbohydrates",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 18.24,
              },
              {
                name: "Fat",
                amount: 13.63,
                unit: "g",
                percentOfDailyNeeds: 32.67,
              },
              {
                name: "Vitamin K",
                amount: 25.06,
                unit: "µg",
                percentOfDailyNeeds: 56.32,
              },
              {
                name: "Vitamin B2",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 11.08,
              },
              {
                name: "Folate",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 22.07,
              },
              {
                name: "Magnesium",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 32.37,
              },
              {
                name: "Copper",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 24.34,
              },
              {
                name: "Sodium",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 3.37,
              },
              {
                name: "Zinc",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 14.23,
              },
              {
                name: "Selenium",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 62.14,
              },
              {
                name: "Lycopene",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
            ],
          },
          {
            id: 12023,
            name: "sesame seeds",
            amount: 0.38,
            unit: "tablespoons",
            nutrients: [
              {
                name: "Potassium",
                amount: 14.04,
                unit: "mg",
                percentOfDailyNeeds: 11.54,
              },
              {
                name: "Vitamin E",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 13.96,
              },
              {
                name: "Protein",
                amount: 0.53,
                unit: "g",
                percentOfDailyNeeds: 26.76,
              },
              {
                name: "Phosphorus",
                amount: 18.87,
                unit: "mg",
                percentOfDailyNeeds: 24.46,
              },
              {
                name: "Vitamin B3",
                amount: 0.14,
                unit: "mg",
                percentOfDailyNeeds: 25.91,
              },
              {
                name: "Fiber",
                amount: 0.35,
                unit: "g",
                percentOfDailyNeeds: 12.81,
              },
              {
                name: "Poly Unsaturated Fat",
                amount: 0.65,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Folic Acid",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B5",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 12.12,
              },
              {
                name: "Vitamin D",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calcium",
                amount: 29.25,
                unit: "mg",
                percentOfDailyNeeds: 9.22,
              },
              {
                name: "Caffeine",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Sugar",
                amount: 0.01,
                unit: "g",
                percentOfDailyNeeds: 7.76,
              },
              {
                name: "Mono Unsaturated Fat",
                amount: 0.56,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calories",
                amount: 17.19,
                unit: "kcal",
                percentOfDailyNeeds: 22.03,
              },
              {
                name: "Vitamin A",
                amount: 0.27,
                unit: "IU",
                percentOfDailyNeeds: 34.69,
              },
              {
                name: "Vitamin C",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 91.49,
              },
              {
                name: "Saturated Fat",
                amount: 0.21,
                unit: "g",
                percentOfDailyNeeds: 21.2,
              },
              {
                name: "Iron",
                amount: 0.44,
                unit: "mg",
                percentOfDailyNeeds: 23.37,
              },
              {
                name: "Vitamin B12",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B1",
                amount: 0.02,
                unit: "mg",
                percentOfDailyNeeds: 28.18,
              },
              {
                name: "Cholesterol",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Alcohol",
                amount: 0.0,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Net Carbohydrates",
                amount: 0.35,
                unit: "g",
                percentOfDailyNeeds: 18.74,
              },
              {
                name: "Choline",
                amount: 0.77,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B6",
                amount: 0.02,
                unit: "mg",
                percentOfDailyNeeds: 19.56,
              },
              {
                name: "Carbohydrates",
                amount: 0.7,
                unit: "g",
                percentOfDailyNeeds: 18.24,
              },
              {
                name: "Manganese",
                amount: 0.07,
                unit: "mg",
                percentOfDailyNeeds: 108.43,
              },
              {
                name: "Fat",
                amount: 1.49,
                unit: "g",
                percentOfDailyNeeds: 32.67,
              },
              {
                name: "Vitamin K",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 56.32,
              },
              {
                name: "Vitamin B2",
                amount: 0.01,
                unit: "mg",
                percentOfDailyNeeds: 11.08,
              },
              {
                name: "Folate",
                amount: 2.91,
                unit: "µg",
                percentOfDailyNeeds: 22.07,
              },
              {
                name: "Magnesium",
                amount: 10.53,
                unit: "mg",
                percentOfDailyNeeds: 32.37,
              },
              {
                name: "Copper",
                amount: 0.12,
                unit: "mg",
                percentOfDailyNeeds: 24.34,
              },
              {
                name: "Sodium",
                amount: 0.33,
                unit: "mg",
                percentOfDailyNeeds: 3.37,
              },
              {
                name: "Zinc",
                amount: 0.23,
                unit: "mg",
                percentOfDailyNeeds: 14.23,
              },
              {
                name: "Selenium",
                amount: 1.03,
                unit: "µg",
                percentOfDailyNeeds: 62.14,
              },
              {
                name: "Lycopene",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
            ],
          },
          {
            id: 10020124,
            name: "spaghetti",
            amount: 0.13,
            unit: "pound",
            nutrients: [
              {
                name: "Potassium",
                amount: 121.9,
                unit: "mg",
                percentOfDailyNeeds: 11.54,
              },
              {
                name: "Selenium",
                amount: 41.39,
                unit: "µg",
                percentOfDailyNeeds: 62.14,
              },
              {
                name: "Protein",
                amount: 8.3,
                unit: "g",
                percentOfDailyNeeds: 26.76,
              },
              {
                name: "Phosphorus",
                amount: 146.28,
                unit: "mg",
                percentOfDailyNeeds: 24.46,
              },
              {
                name: "Vitamin B3",
                amount: 2.91,
                unit: "mg",
                percentOfDailyNeeds: 25.91,
              },
              {
                name: "Poly Unsaturated Fat",
                amount: 0.32,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin D",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Folic Acid",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B5",
                amount: 0.56,
                unit: "mg",
                percentOfDailyNeeds: 12.12,
              },
              {
                name: "Calcium",
                amount: 22.68,
                unit: "mg",
                percentOfDailyNeeds: 9.22,
              },
              {
                name: "Mono Unsaturated Fat",
                amount: 0.11,
                unit: "g",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Calories",
                amount: 197.31,
                unit: "kcal",
                percentOfDailyNeeds: 22.03,
              },
              {
                name: "Vitamin A",
                amount: 0.0,
                unit: "IU",
                percentOfDailyNeeds: 34.69,
              },
              {
                name: "Vitamin C",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 91.49,
              },
              {
                name: "Saturated Fat",
                amount: 0.15,
                unit: "g",
                percentOfDailyNeeds: 21.2,
              },
              {
                name: "Iron",
                amount: 2.06,
                unit: "mg",
                percentOfDailyNeeds: 23.37,
              },
              {
                name: "Vitamin B12",
                amount: 0.0,
                unit: "µg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Vitamin B1",
                amount: 0.28,
                unit: "mg",
                percentOfDailyNeeds: 28.18,
              },
              {
                name: "Cholesterol",
                amount: 0.0,
                unit: "mg",
                percentOfDailyNeeds: 0.0,
              },
              {
                name: "Net Carbohydrates",
                amount: 42.54,
                unit: "g",
                percentOfDailyNeeds: 18.74,
              },
              {
                name: "Carbohydrates",
                amount: 42.54,
                unit: "g",
                percentOfDailyNeeds: 18.24,
              },
              {
                name: "Manganese",
                amount: 1.73,
                unit: "mg",
                percentOfDailyNeeds: 108.43,
              },
              {
                name: "Vitamin B6",
                amount: 0.13,
                unit: "mg",
                percentOfDailyNeeds: 19.56,
              },
              {
                name: "Fat",
                amount: 0.79,
                unit: "g",
                percentOfDailyNeeds: 32.67,
              },
              {
                name: "Vitamin B2",
                amount: 0.08,
                unit: "mg",
                percentOfDailyNeeds: 11.08,
              },
              {
                name: "Magnesium",
                amount: 81.08,
                unit: "mg",
                percentOfDailyNeeds: 32.37,
              },
              {
                name: "Folate",
                amount: 32.32,
                unit: "µg",
                percentOfDailyNeeds: 22.07,
              },
              {
                name: "Copper",
                amount: 0.26,
                unit: "mg",
                percentOfDailyNeeds: 24.34,
              },
              {
                name: "Sodium",
                amount: 4.54,
                unit: "mg",
                percentOfDailyNeeds: 3.37,
              },
              {
                name: "Zinc",
                amount: 1.34,
                unit: "mg",
                percentOfDailyNeeds: 14.23,
              },
            ],
          },
        ],
        caloricBreakdown: {
          percentProtein: 11.55,
          percentFat: 41.23,
          percentCarbs: 47.22,
        },
        weightPerServing: {
          amount: 200,
          unit: "g",
        },
      },
      summary:
        'Snow Pea Sesame Noodle Salad requires around <b>45 minutes</b> from start to finish. One serving contains <b>441 calories</b>, <b>13g of protein</b>, and <b>21g of fat</b>. This recipe serves 8 and costs $2.43 per serving. 1 person were glad they tried this recipe. It is a good option if you\'re following a <b>dairy free and lacto ovo vegetarian</b> diet. It is brought to you by Foodista. A mixture of vegetable oil, smooth peanut butter, scallions, and a handful of other ingredients are all it takes to make this recipe so flavorful. It works well as a rather inexpensive main course. Overall, this recipe earns an <b>excellent spoonacular score of 82%</b>. <a href="https://spoonacular.com/recipes/snow-pea-salad-with-sesame-dressing-17551">Snow Pea Salad with Sesame Dressing</a>, <a href="https://spoonacular.com/recipes/sesame-snow-pea-and-shiitake-pasta-salad-37175">Sesame, Snow Pea, And Shiitake Pasta Salad</a>, and <a href="https://spoonacular.com/recipes/snow-pea-and-red-onion-salad-with-sesame-vinaigrette-recipe-18570">Snow Pean And Red Onion Salad With Sesame Vinaigrette Recipe</a> are very similar to this recipe.',
      cuisines: [],
      dishTypes: [
        "side dish",
        "lunch",
        "main course",
        "salad",
        "main dish",
        "dinner",
      ],
      diets: ["dairy free", "lacto ovo vegetarian"],
      occasions: [],
      instructions:
        "<ol><li>Bring a large pot of salted water to a boil. Add snow pea pods and cook 1-2 minutes, until crisp tender. Remove from pot with a slotted spoon and place in an ice bath to stop from cooking any further and to maintain a bright green color. Bring water to boil again and add spaghetti. Cook according to package directions. Drain and set aside.</li><li>Whisk together the vegetable oil, rice wine vinegar, soy sauce, sesame oil, honey, garlic, ginger, 2 tablespoons sesame seeds and peanut butter in a medium bowl.</li><li>In a large bowl, combine the spaghetti, snow peas, peppers and scallions in a large bowl. Bit by bit, toss in the dressing over to the spaghetti mixture until you are satisfied with the result. You probably will not need to add all of the dressing.</li><li>Add the remaining 1 tablespoon of sesame seeds and the parsley and toss together.</li></ol>",
      analyzedInstructions: [
        {
          name: "",
          steps: [
            {
              number: 1,
              step: "Bring a large pot of salted water to a boil.",
              ingredients: [
                {
                  id: 14412,
                  name: "water",
                  localizedName: "water",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/water.png",
                },
              ],
              equipment: [
                {
                  id: 404752,
                  name: "pot",
                  localizedName: "pot",
                  image:
                    "https://spoonacular.com/cdn/equipment_100x100/stock-pot.jpg",
                },
              ],
            },
            {
              number: 2,
              step: "Add snow pea pods and cook 1-2 minutes, until crisp tender.",
              ingredients: [
                {
                  id: 11300,
                  name: "snow peas",
                  localizedName: "snow peas",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/snow-peas.jpg",
                },
              ],
              equipment: [],
              length: {
                number: 2,
                unit: "minutes",
              },
            },
            {
              number: 3,
              step: "Remove from pot with a slotted spoon and place in an ice bath to stop from cooking any further and to maintain a bright green color. Bring water to boil again and add spaghetti. Cook according to package directions.",
              ingredients: [
                {
                  id: 11420420,
                  name: "spaghetti",
                  localizedName: "spaghetti",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/spaghetti.jpg",
                },
                {
                  id: 14412,
                  name: "water",
                  localizedName: "water",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/water.png",
                },
                {
                  id: 10014412,
                  name: "ice",
                  localizedName: "ice",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/ice-cubes.png",
                },
              ],
              equipment: [
                {
                  id: 404636,
                  name: "slotted spoon",
                  localizedName: "slotted spoon",
                  image:
                    "https://spoonacular.com/cdn/equipment_100x100/slotted-spoon.jpg",
                },
                {
                  id: 404752,
                  name: "pot",
                  localizedName: "pot",
                  image:
                    "https://spoonacular.com/cdn/equipment_100x100/stock-pot.jpg",
                },
              ],
            },
            {
              number: 4,
              step: "Drain and set aside.",
              ingredients: [],
              equipment: [],
            },
            {
              number: 5,
              step: "Whisk together the vegetable oil, rice wine vinegar, soy sauce, sesame oil, honey, garlic, ginger, 2 tablespoons sesame seeds and peanut butter in a medium bowl.In a large bowl, combine the spaghetti, snow peas, peppers and scallions in a large bowl. Bit by bit, toss in the dressing over to the spaghetti mixture until you are satisfied with the result. You probably will not need to add all of the dressing.",
              ingredients: [
                {
                  id: 1022053,
                  name: "rice vinegar",
                  localizedName: "rice vinegar",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/rice-vinegar.png",
                },
                {
                  id: 16098,
                  name: "peanut butter",
                  localizedName: "peanut butter",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/peanut-butter.png",
                },
                {
                  id: 4669,
                  name: "vegetable oil",
                  localizedName: "vegetable oil",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/vegetable-oil.jpg",
                },
                {
                  id: 12023,
                  name: "sesame seeds",
                  localizedName: "sesame seeds",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/sesame-seeds.png",
                },
                {
                  id: 4058,
                  name: "sesame oil",
                  localizedName: "sesame oil",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/sesame-oil.png",
                },
                {
                  id: 11291,
                  name: "green onions",
                  localizedName: "green onions",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/spring-onions.jpg",
                },
                {
                  id: 11300,
                  name: "snow peas",
                  localizedName: "snow peas",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/snow-peas.jpg",
                },
                {
                  id: 16124,
                  name: "soy sauce",
                  localizedName: "soy sauce",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/soy-sauce.jpg",
                },
                {
                  id: 11420420,
                  name: "spaghetti",
                  localizedName: "spaghetti",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/spaghetti.jpg",
                },
                {
                  id: 10111333,
                  name: "peppers",
                  localizedName: "peppers",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/green-pepper.jpg",
                },
                {
                  id: 11215,
                  name: "garlic",
                  localizedName: "garlic",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/garlic.png",
                },
                {
                  id: 11216,
                  name: "ginger",
                  localizedName: "ginger",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/ginger.png",
                },
                {
                  id: 19296,
                  name: "honey",
                  localizedName: "honey",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/honey.png",
                },
              ],
              equipment: [
                {
                  id: 404661,
                  name: "whisk",
                  localizedName: "whisk",
                  image:
                    "https://spoonacular.com/cdn/equipment_100x100/whisk.png",
                },
                {
                  id: 404783,
                  name: "bowl",
                  localizedName: "bowl",
                  image:
                    "https://spoonacular.com/cdn/equipment_100x100/bowl.jpg",
                },
              ],
            },
            {
              number: 6,
              step: "Add the remaining 1 tablespoon of sesame seeds and the parsley and toss together.",
              ingredients: [
                {
                  id: 12023,
                  name: "sesame seeds",
                  localizedName: "sesame seeds",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/sesame-seeds.png",
                },
                {
                  id: 11297,
                  name: "parsley",
                  localizedName: "parsley",
                  image:
                    "https://spoonacular.com/cdn/ingredients_100x100/parsley.jpg",
                },
              ],
              equipment: [],
            },
          ],
        },
      ],
      originalId: null,
      spoonacularScore: 78.83985900878906,
      spoonacularSourceUrl:
        "https://spoonacular.com/snow-pea-sesame-noodle-salad-660475",
    },
  ],
  offset: 0,
  number: 1,
  totalResults: 4868,
};

export const expectedRecipe: Omit<Recipe, "_id"> = {
  id: 660475,
  name: "Snow Pea Sesame Noodle Salad",
  url: "https://spoonacular.com/snow-pea-sesame-noodle-salad-660475",
  image: "https://img.spoonacular.com/recipes/660475-556x370.jpg",
  credit: "Foodista.com – The Cooking Encyclopedia Everyone Can Edit",
  sourceUrl:
    "http://www.foodista.com/recipe/GVH4JXJ2/snow-pea-sesame-noodle-salad",
  healthScore: 36,
  time: 45,
  servings: 8,
  summary:
    'Snow Pea Sesame Noodle Salad requires around <b>45 minutes</b> from start to finish. One serving contains <b>441 calories</b>, <b>13g of protein</b>, and <b>21g of fat</b>. This recipe serves 8 and costs $2.43 per serving. 1 person were glad they tried this recipe. It is a good option if you\'re following a <b>dairy free and lacto ovo vegetarian</b> diet. It is brought to you by Foodista. A mixture of vegetable oil, smooth peanut butter, scallions, and a handful of other ingredients are all it takes to make this recipe so flavorful. It works well as a rather inexpensive main course. Overall, this recipe earns an <b>excellent spoonacular score of 82%</b>. <a href="https://spoonacular.com/recipes/snow-pea-salad-with-sesame-dressing-17551">Snow Pea Salad with Sesame Dressing</a>, <a href="https://spoonacular.com/recipes/sesame-snow-pea-and-shiitake-pasta-salad-37175">Sesame, Snow Pea, And Shiitake Pasta Salad</a>, and <a href="https://spoonacular.com/recipes/snow-pea-and-red-onion-salad-with-sesame-vinaigrette-recipe-18570">Snow Pean And Red Onion Salad With Sesame Vinaigrette Recipe</a> are very similar to this recipe.',
  types: ["side dish", "lunch", "main course", "salad", "main dish", "dinner"],
  spiceLevel: "mild",
  isVegetarian: true,
  isVegan: false,
  isGlutenFree: false,
  isHealthy: false,
  isCheap: false,
  isSustainable: false,
  culture: [],
  nutrients: [
    {
      amount: 440.55,
      name: "Calories",
      unit: "kcal",
    },
    {
      amount: 21.23,
      name: "Fat",
      unit: "g",
    },
    {
      amount: 3.39,
      name: "Saturated Fat",
      unit: "g",
    },
    {
      amount: 54.73,
      name: "Carbohydrates",
      unit: "g",
    },
    {
      amount: 3.2,
      name: "Fiber",
      unit: "g",
    },
    {
      amount: 6.98,
      name: "Sugar",
      unit: "g",
    },
    {
      amount: 13.38,
      name: "Protein",
      unit: "g",
    },
    {
      amount: 0.0,
      name: "Cholesterol",
      unit: "mg",
    },
    {
      amount: 77.61,
      name: "Sodium",
      unit: "mg",
    },
  ],
  ingredients: [
    {
      amount: 0.13,
      id: 10211216,
      name: "ginger",
      unit: "teaspoon",
    },
    {
      amount: 0.38,
      id: 10511297,
      name: "parsley",
      unit: "tablespoons",
    },
    {
      amount: 0.25,
      id: 10211215,
      name: "garlic cloves",
      unit: "",
    },
    {
      amount: 0.13,
      id: 19296,
      name: "honey",
      unit: "tablespoon",
    },
    {
      amount: 0.25,
      id: 11821,
      name: "bell peppers",
      unit: "",
    },
    {
      amount: 0.03,
      id: 1022053,
      name: "rice wine vinegar",
      unit: "cup",
    },
    {
      amount: 0.5,
      id: 11291,
      name: "scallions",
      unit: "stalks",
    },
    {
      amount: 0.75,
      id: 4058,
      name: "sesame oil",
      unit: "tablespoons",
    },
    {
      amount: 0.04,
      id: 10116098,
      name: "smooth peanut butter",
      unit: "cup",
    },
    {
      amount: 0.13,
      id: 11300,
      name: "snow peas",
      unit: "pound",
    },
    {
      amount: 0.06,
      id: 16124,
      name: "soy sauce",
      unit: "teaspoon",
    },
    {
      amount: 0.06,
      id: 4669,
      name: "vegetable oil",
      unit: "cup",
    },
    {
      amount: 0.38,
      id: 12023,
      name: "sesame seeds",
      unit: "tablespoons",
    },
    {
      amount: 0.13,
      id: 10020124,
      name: "spaghetti",
      unit: "pound",
    },
  ],
  instructions: [
    {
      name: "",
      steps: [
        {
          equipment: [
            {
              id: 404752,
              image: "stock-pot.jpg",
              name: "pot",
            },
          ],
          ingredients: [
            {
              id: 14412,
              image: "water.png",
              name: "water",
            },
          ],
          number: 1,
          step: "Bring a large pot of salted water to a boil.",
        },
        {
          equipment: [],
          ingredients: [
            {
              id: 11300,
              image: "snow-peas.jpg",
              name: "snow peas",
            },
          ],
          number: 2,
          step: "Add snow pea pods and cook 1-2 minutes, until crisp tender.",
        },
        {
          equipment: [
            {
              id: 404636,
              image: "slotted-spoon.jpg",
              name: "slotted spoon",
            },
            {
              id: 404752,
              image: "stock-pot.jpg",
              name: "pot",
            },
          ],
          ingredients: [
            {
              id: 11420420,
              image: "spaghetti.jpg",
              name: "spaghetti",
            },
            {
              id: 14412,
              image: "water.png",
              name: "water",
            },
            {
              id: 10014412,
              image: "ice-cubes.png",
              name: "ice",
            },
          ],
          number: 3,
          step: "Remove from pot with a slotted spoon and place in an ice bath to stop from cooking any further and to maintain a bright green color. Bring water to boil again and add spaghetti. Cook according to package directions.",
        },
        {
          equipment: [],
          ingredients: [],
          number: 4,
          step: "Drain and set aside.",
        },
        {
          equipment: [
            {
              id: 404661,
              image: "whisk.png",
              name: "whisk",
            },
            {
              id: 404783,
              image: "bowl.jpg",
              name: "bowl",
            },
          ],
          ingredients: [
            {
              id: 1022053,
              image: "rice-vinegar.png",
              name: "rice vinegar",
            },
            {
              id: 16098,
              image: "peanut-butter.png",
              name: "peanut butter",
            },
            {
              id: 4669,
              image: "vegetable-oil.jpg",
              name: "vegetable oil",
            },
            {
              id: 12023,
              image: "sesame-seeds.png",
              name: "sesame seeds",
            },
            {
              id: 4058,
              image: "sesame-oil.png",
              name: "sesame oil",
            },
            {
              id: 11291,
              image: "spring-onions.jpg",
              name: "green onions",
            },
            {
              id: 11300,
              image: "snow-peas.jpg",
              name: "snow peas",
            },
            {
              id: 16124,
              image: "soy-sauce.jpg",
              name: "soy sauce",
            },
            {
              id: 11420420,
              image: "spaghetti.jpg",
              name: "spaghetti",
            },
            {
              id: 10111333,
              image: "green-pepper.jpg",
              name: "peppers",
            },
            {
              id: 11215,
              image: "garlic.png",
              name: "garlic",
            },
            {
              id: 11216,
              image: "ginger.png",
              name: "ginger",
            },
            {
              id: 19296,
              image: "honey.png",
              name: "honey",
            },
          ],
          number: 5,
          step: "Whisk together the vegetable oil, rice wine vinegar, soy sauce, sesame oil, honey, garlic, ginger, 2 tablespoons sesame seeds and peanut butter in a medium bowl.In a large bowl, combine the spaghetti, snow peas, peppers and scallions in a large bowl. Bit by bit, toss in the dressing over to the spaghetti mixture until you are satisfied with the result. You probably will not need to add all of the dressing.",
        },
        {
          equipment: [],
          ingredients: [
            {
              id: 12023,
              image: "sesame-seeds.png",
              name: "sesame seeds",
            },
            {
              id: 11297,
              image: "parsley.jpg",
              name: "parsley",
            },
          ],
          number: 6,
          step: "Add the remaining 1 tablespoon of sesame seeds and the parsley and toss together.",
        },
      ],
    },
  ],
  averageRating: null,
  totalRatings: 0,
  views: 0,
};
