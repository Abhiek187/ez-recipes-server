import cors from "cors";
import "dotenv/config"; // fetch secrets from .env
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import docs from "./routes/docs";
import recipes from "./routes/recipes";
import terms from "./routes/terms";
import chefs from "./routes/chefs";
import { connectToMongoDB } from "./utils/db";

const app = express();
app.disable("x-powered-by"); // disable fingerprinting

/**
 * Initialize middleware:
 * - Parse JSON
 * - Serve Swagger UI files
 * - Enable CORS
 * - Add security headers
 * - Add rate limiting
 */
app.use(express.json());
app.use(
  cors({
    // Only allow the web app & local server to access the server in the browser
    origin: ["http://localhost:4200", "https://ez-recipes-web.onrender.com"],
  })
);
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
app.use("/api/chefs", chefs);

connectToMongoDB();

// parseInt() requires a string, not undefined
const port = parseInt(`${process.env.PORT}`) || 5000;

app.listen(port, () => console.log(`Server listening on port ${port}...`));
