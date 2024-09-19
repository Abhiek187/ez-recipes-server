type Chef = {
  _id: string; // Firebase UID
  email: string;
  ratings: Record<string, number>;
  recentRecipes: Set<string>;
  favoriteRecipes: Set<string>;
};

export default Chef;
