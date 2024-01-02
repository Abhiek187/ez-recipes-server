import mongoose from "mongoose";

const connectToMongoDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}`);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1); // exit with failure
  }
};

export default connectToMongoDB;
