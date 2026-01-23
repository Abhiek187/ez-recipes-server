import { model, Schema } from "mongoose";
import Chef from "../types/client/Chef";

const PasskeySchema = new Schema<Chef["passkeys"][number]>(
  {
    webAuthnUserID: { type: String },
    id: { type: String, required: true },
    publicKey: {
      type: Buffer,
      required: true,
      // Automatically convert between Uint8Arrays and Buffers in MongoDB
      set: (value: Uint8Array | Buffer) =>
        value instanceof Uint8Array ? Buffer.from(value) : value,
      get: (value: Buffer) => new Uint8Array(value),
    },
    counter: { type: Number, required: true },
    transports: { type: [String] },
    deviceType: { type: String, required: true },
    backedUp: { type: Boolean, required: true },
    name: { type: String, required: true },
    lastUsed: { type: Date, required: true },
    iconLight: { type: String },
    iconDark: { type: String },
  },
  { _id: false }
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
