import mongoose from "mongoose";

// MongoDB indexes
export const Indexes = {
  RecipeName: "recipe-name",
  RecipeSummary: "recipe-summary",
} as const;

export const MAX_DOCS = 100;

/**
 * Connect to MongoDB using mongoose
 */
export const connectToMongoDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}`);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1); // exit with failure
  }
};

/**
 * Disconnect from MongoDB using mongoose
 */
export const disconnectFromMongoDB = async () => {
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB");
};

export * from "./recipes";
export * from "./chefs";
export * from "./temp";
