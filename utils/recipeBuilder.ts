export const recipeBuilder = (): string => {
  /*
    Low-effort filter recipes
    - Uses 5 or fewer ingredients
    - Only uses common ingredients like chicken, potatoes, onions, and carrots. We want these recipes to be dishes people can put together with ingredients lying around the kitchen
    - 1 hour or less of cook time
    - Can make 3 or more servings
    */
  const apiKey = process.env.API_KEY;
  let url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${apiKey}&instructionsRequired=true&addRecipeNutrition=true&maxReadyTime=60&sort=random&number=1`;
  return encodeURI(url);
};
