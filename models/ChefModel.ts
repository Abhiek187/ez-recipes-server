import { model, Schema } from "mongoose";
import Chef from "../types/client/Chef";

const ChefSchema = new Schema<Chef>({
  email: { type: String, required: true },
  ratings: { type: Map, of: Number, required: true },
  recentRecipes: { type: [String], required: true, unique: true },
  favoriteRecipes: { type: [String], required: true, unique: true },
});

export default model("chef", ChefSchema);
