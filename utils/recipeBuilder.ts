export const recipeBuilder = (): string => {
  /*
    Low-effort filter recipes
    - Uses 5 or fewer ingredients
    - Only uses common ingredients like chicken, potatoes, onions, and carrots. We want these recipes to be dishes people can put together with ingredients lying around the kitchen
    - 1 hour or less of cook time
    - Can make 3 or more servings
    */
  const appId = process.env.APPLICATION_ID;
  const appKey = process.env.APPLICATION_KEY;
  let url = `https://api.edamam.com/api/recipes/v2?type=public&app_id=${appId}&app_key=${appKey}&ingr=5&time=1-60&random=true`;
  return encodeURI(url);
};
