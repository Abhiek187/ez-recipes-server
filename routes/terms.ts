import express from "express";
import Term from "../models/Term";

const router = express.Router();

router.get("/", async (req, res) => {
  // Get all words and their definitions
  try {
    const terms = await Term.find();
    res.json(terms);
  } catch (error) {
    console.error("Failed to get all terms:", error);
    res.status(500).json(error);
  }
});

export default router;
