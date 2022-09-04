import { recipeBuilder } from "../utils/recipeBuilder";

describe("recipeBuilder", () => {
  test("returns the correct random recipe URL", () => {
    // Given query params like the API key
    const apiKey = process.env.API_KEY;

    // When the recipeBuilder method is called
    const recipeUrl = recipeBuilder();

    // Then it should return the correct spoonacular URL to fetch a random recipe
    expect(recipeUrl).toBe(
      `https://api.spoonacular.com/recipes/complexSearch?apiKey=${apiKey}&instructionsRequired=true&addRecipeNutrition=true&maxReadyTime=60&sort=random&number=1`
    );
  });
});
