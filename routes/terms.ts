import express from "express";
import Term from "../models/Term";

const router = express.Router();

router.get("/", async (req, res) => {
  // Get all words and their definitions
  try {
    // exec() returns a promise for better stack traces
    const terms = await Term.find().exec();
    res.json(terms);
  } catch (error) {
    console.error("Failed to get all terms:", error);
    res.status(500).json(error);
  }
});

export default router;
