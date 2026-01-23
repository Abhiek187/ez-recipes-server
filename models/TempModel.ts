import { model, Schema } from "mongoose";
import Temp from "../types/client/Temp";

// Reserved for storing temporary data with TTL (60s)
const TempSchema = new Schema<Temp>({
  _id: { type: String, required: true },
  createdAt: { type: Date, expires: 60, default: Date.now },
  challenge: { type: String },
  webAuthnUserID: { type: String },
});

// Don't pluralize "temp"
export default model("temp", TempSchema, "temp");
