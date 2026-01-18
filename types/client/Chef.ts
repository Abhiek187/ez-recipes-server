import Passkey from "./Passkey";

type Chef = {
  _id: string; // Firebase UID
  refreshToken: string | null;
  passkeys: Passkey[];
  ratings: Map<string, number>;
  recentRecipes: Map<string, Date>;
  favoriteRecipes: string[];
};

export default Chef;
