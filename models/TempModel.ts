import { model, Schema } from "mongoose";
import Temp from "../types/client/Temp";

// Reserved for storing temporary data with TTL
const TempSchema = new Schema<Temp>({
  _id: { type: String, required: true },
  expiresAt: { type: Date, expires: 0 }, // can specify any TTL here
  challenge: { type: String },
});

// Don't pluralize "temp"
export default model("temp", TempSchema, "temp");
