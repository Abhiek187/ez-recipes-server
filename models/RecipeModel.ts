import { Schema, model } from "mongoose";
import Recipe, { CUISINES, MEAL_TYPES } from "../types/client/Recipe";

const NutritionSchema = new Schema<Recipe["nutrients"][number]>({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  unit: { type: String, required: true },
});

const IngredientSchema = new Schema<Recipe["ingredients"][number]>({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  unit: { type: String, required: true },
});

const StepIngredientSchema = new Schema<
  Recipe["instructions"][number]["steps"][number]["ingredients"][number]
>({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
});

const StepEquipmentSchema = new Schema<
  Recipe["instructions"][number]["steps"][number]["equipment"][number]
>({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
});

const StepSchema = new Schema<Recipe["instructions"][number]["steps"][number]>({
  number: { type: Number, required: true },
  step: { type: String, required: true },
  ingredients: { type: [StepIngredientSchema], required: true },
  equipment: { type: [StepEquipmentSchema], required: true },
});

const InstructionSchema = new Schema<Recipe["instructions"][number]>({
  name: { type: String, required: true },
  steps: { type: [StepSchema], required: true },
});

const RecipeSchema = new Schema<Recipe>({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  image: { type: String, required: true },
  credit: { type: String, required: true },
  sourceUrl: { type: String, required: true },
  healthScore: { type: Number, required: true },
  time: { type: Number, required: true },
  servings: { type: Number, required: true },
  summary: { type: String, required: true },
  types: { type: [String], enum: MEAL_TYPES, required: true },
  spiceLevel: { type: String, enum: ["none", "mild", "spicy"], required: true },
  isVegetarian: { type: Boolean, required: true },
  isVegan: { type: Boolean, required: true },
  isGlutenFree: { type: Boolean, required: true },
  isHealthy: { type: Boolean, required: true },
  isCheap: { type: Boolean, required: true },
  isSustainable: { type: Boolean, required: true },
  culture: { type: [String], enum: CUISINES, required: true },
  //allergies: any[];
  nutrients: { type: [NutritionSchema], required: true },
  ingredients: { type: [IngredientSchema], required: true },
  instructions: { type: [InstructionSchema], required: true },
  averageRating: { type: Number, default: null },
  totalRatings: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
});

export default model("recipe", RecipeSchema);
