import express from "express";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";

// Convert the OpenAPI spec from YAML to JSON
const swaggerFile = fs.readFileSync("./openapi.yaml", "utf8");
const swaggerDocument: swaggerUi.JsonObject = YAML.parse(swaggerFile);

const router = express.Router();
router.use("/", swaggerUi.serve);
router.get("/", swaggerUi.setup(swaggerDocument));

export default router;
