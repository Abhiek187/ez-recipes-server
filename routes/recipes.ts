import axios from "axios";
import express from "express";

const router = express.Router();
const appId = process.env.APPLICATION_ID;
const appKey = process.env.APPLICATION_KEY;

// Get a random, low-effort recipe
router.get("/random", async (req, res) => {
  const url = encodeURI(
    `https://api.edamam.com/api/recipes/v2?type=public&q=chicken&app_id=${appId}&app_key=${appKey}`
  );

  try {
    const recipeResponse = await axios.get(url);
    return res.json(recipeResponse.data);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Oops, check the logs!");
  }
});

export default router;
