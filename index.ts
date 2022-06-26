import "dotenv/config"; // fetch secrets from .env
import express from "express";

import recipes from "./routes/recipes";

const app = express();

// Initialize middleware: parse JSON
app.use(express.json());

// Define routes
app.use("/api/recipes", recipes);

// parseInt() requires a string, not undefined
const port = parseInt(`${process.env.PORT}`) || 5000;

app.listen(port, () => console.log(`Server listening on port ${port}...`));
