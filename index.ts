import cors from "cors";
import "dotenv/config"; // fetch secrets from .env
import express from "express";
import helmet from "helmet";

import docs from "./routes/docs";
import recipes from "./routes/recipes";

const app = express();

/**
 * Initialize middleware:
 * - Parse JSON
 * - Serve Swagger UI files
 * - Enable CORS
 * - Add security headers
 */
app.use(express.json());
app.use(cors());
app.use(
  helmet({
    // Customize the CSP header to enable "Try it out"
    contentSecurityPolicy: {
      directives: {
        "connect-src": ["'self'", "ez-recipes-server.onrender.com"],
      },
    },
  })
);

// Define routes
app.use("/", docs);
app.use("/api/recipes", recipes);

// parseInt() requires a string, not undefined
const port = parseInt(`${process.env.PORT}`) || 5000;

app.listen(port, () => console.log(`Server listening on port ${port}...`));
