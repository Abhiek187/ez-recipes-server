import { model, Schema } from "mongoose";
import Chef from "../types/client/Chef";

const ChefSchema = new Schema<Chef>({
  _id: { type: String, required: true },
  refreshToken: { type: String, default: null },
  ratings: { type: Map, of: Number, required: true },
  recentRecipes: { type: [String], required: true },
  favoriteRecipes: { type: [String], required: true },
});

export default model("chef", ChefSchema);
