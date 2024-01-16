import { Schema, model } from "mongoose";
import Term from "../types/client/Term";

const TermSchema = new Schema<Term>({
  word: { type: String, required: true },
  definition: { type: String, required: true },
});

// Model name maps to a pluralized collection name
export default model("term", TermSchema);
