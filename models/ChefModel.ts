import { model, Schema } from "mongoose";
import Chef from "../types/client/Chef";

const PasskeySchema = new Schema<Chef["passkeys"][number]>(
  {
    webAuthnUserID: { type: String },
    id: { type: String, required: true },
    publicKey: { type: Buffer, required: true },
    counter: { type: Number, required: true },
    transports: { type: [String] },
    deviceType: { type: String, required: true },
    backedUp: { type: Boolean, required: true },
  },
  { _id: false },
);

const ChefSchema = new Schema<Chef>({
  _id: { type: String, required: true },
  refreshToken: { type: String, default: null },
  passkeys: { type: [PasskeySchema], default: [] },
  ratings: { type: Map, of: Number, required: true },
  recentRecipes: { type: Map, of: Date, required: true },
  favoriteRecipes: { type: [String], required: true },
});

export default model("chef", ChefSchema);
