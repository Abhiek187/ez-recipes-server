type Chef = {
  _id: string; // Firebase UID
  refreshToken: string | null;
  ratings: Map<string, number>;
  recentRecipes: Map<string, Date>;
  favoriteRecipes: string[];
};

export default Chef;
