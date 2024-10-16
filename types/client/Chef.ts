type Chef = {
  _id: string; // Firebase UID
  refreshToken: string | null;
  ratings: Record<string, number>;
  recentRecipes: Record<string, Date>;
  favoriteRecipes: string[];
};

export default Chef;
