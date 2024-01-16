import cors from "cors";
import "dotenv/config"; // fetch secrets from .env
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import docs from "./routes/docs";
import recipes from "./routes/recipes";
import terms from "./routes/terms";
import { connectToMongoDB } from "./utils/db";

const app = express();

/**
 * Initialize middleware:
 * - Parse JSON
 * - Serve Swagger UI files
 * - Enable CORS
 * - Add security headers
 * - Add rate limiting
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
app.use(
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 60, // limit each IP to 60 requests per `window` (here, per hour).
    standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // disable the `X-RateLimit-*` headers.
    validate: { xForwardedForHeader: false }, // apply the limit globally
  })
);

// Define routes
app.use("/", docs);
app.use("/api/recipes", recipes);
app.use("/api/terms", terms);

connectToMongoDB();

// parseInt() requires a string, not undefined
const port = parseInt(`${process.env.PORT}`) || 5000;

app.listen(port, () => console.log(`Server listening on port ${port}...`));
