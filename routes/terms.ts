import express from "express";
import TermModel from "../models/TermModel";

const router = express.Router();

router.get("/", async (_req, res) => {
  // Get all words and their definitions
  try {
    // exec() returns a promise for better stack traces
    const terms = await TermModel.find().exec();
    res.json(terms);
  } catch (error) {
    console.error("Failed to get all terms:", error);
    res.status(500).json(error);
  }
});

export default router;
