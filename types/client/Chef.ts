type Chef = {
  _id: string; // Firebase UID
  refreshToken: string | null;
  ratings: Record<string, number>;
  recentRecipes: string[];
  favoriteRecipes: string[];
};

export default Chef;
