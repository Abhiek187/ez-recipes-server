import "dotenv/config";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { OAuthTokenVerifier } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";
import { connection, ConnectionStates } from "mongoose";
import { randomUUID } from "node:crypto";
import z from "zod/v3";

import FirebaseAdmin from "../utils/auth/admin";
import {
  connectToMongoDB,
  disconnectFromMongoDB,
  filterRecipes,
  getRecipeById,
} from "../utils/db";
import { CUISINES, MEAL_TYPES, SPICE_LEVELS } from "../types/client/Recipe";
import { filterObject, isEmptyObject } from "../utils/object";

const MCP_NAME = "ez-recipes";
let _server: McpServer | null = null;
const transports: Record<string, StreamableHTTPServerTransport> = {};

const createMcpServer = () => {
  const server = new McpServer(
    {
      name: MCP_NAME,
      version: "1.0.0",
    },
    {
      capabilities: {
        logging: {},
      },
    }
  );

  server.registerTool(
    `${MCP_NAME}_search_recipes`,
    {
      description: "Search recipes using a variety of filters",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .optional()
          .describe(
            "An full-text query to search recipes by name or description"
          ),
        minCals: z
          .number()
          .int()
          .min(0)
          .max(2000)
          .optional()
          .describe("The minimum number of calories for a recipe"),
        maxCals: z
          .number()
          .int()
          .min(0)
          .max(2000)
          .optional()
          .describe("The maximum number of calories for a recipe"),
        vegetarian: z
          .boolean()
          .optional()
          .describe("Whether the recipes must be vegetarian"),
        vegan: z
          .boolean()
          .optional()
          .describe("Whether the recipes must be vegan"),
        glutenFree: z
          .boolean()
          .optional()
          .describe("Whether the recipes must be gluten-free"),
        healthy: z
          .boolean()
          .optional()
          .describe("Whether the recipes must be healthy"),
        cheap: z
          .boolean()
          .optional()
          .describe("Whether the recipes must be cheap"),
        sustainable: z
          .boolean()
          .optional()
          .describe("Whether the recipes must be sustainable"),
        rating: z
          .number()
          .int()
          .min(1)
          .max(5)
          .optional()
          .describe("The minimum number of stars a recipe is rated, from 1-5"),
        spiceLevels: z
          .array(z.enum(SPICE_LEVELS).exclude(["unknown"]))
          .optional()
          .describe("The spice levels for a recipe: none, mild, or spicy"),
        types: z
          .array(z.enum(MEAL_TYPES))
          .optional()
          .describe(
            "The meal types a recipe is appropriate for, such as breakfast, lunch, or dinner"
          ),
        cultures: z
          .array(z.enum(CUISINES))
          .optional()
          .describe(
            "The cuisine types associated with a recipe, such as American, Italian, or Latin American"
          ),
      },
      outputSchema: z.object({
        results: z.array(
          z.object({
            // Return limited recipe information since get_recipe_details will add more detail
            // (Similar to viewing recipe cards at a glance)
            id: z.number(),
            name: z.string(),
            time: z.number(),
            summary: z.string(),
            nutrients: z.array(
              z.object({
                name: z.string(),
                amount: z.number(),
                unit: z.string(),
              })
            ),
            averageRating: z.number().nullable().optional(),
            totalRatings: z.number().optional(),
          })
        ),
      }),
      annotations: {
        readOnlyHint: true, // only reads data
        destructiveHint: false, // no write actions, so reversible
        idempotentHint: true, // can be called multiple times with consistent results
        openWorldHint: false, // doesn't interact with the open internet (constrained to MongoDB database)
      },
    },
    async (filter) => {
      await server.sendLoggingMessage({
        level: "debug",
        data: `Searching recipes using the following filter: ${JSON.stringify(filter)}`,
      });

      if (isEmptyObject(filter)) {
        return {
          content: [
            {
              type: "text",
              text: "At least one filter must be provided to search for recipes",
            },
          ],
          isError: true,
        };
      }

      const recipes = await filterRecipes(filter);

      if (typeof recipes === "string") {
        return {
          content: [
            {
              type: "text",
              text: `Failed to filter recipes. Error: ${recipes}`,
            },
          ],
          isError: true,
        };
      } else if (recipes === null) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to filter recipes. Please try again later.`,
            },
          ],
          isError: true,
        };
      }

      return {
        // structuredContent must be an object, not an array
        structuredContent: {
          results: recipes.map((recipe) => ({
            ...filterObject(recipe, [
              "id",
              "name",
              "time",
              "summary",
              "averageRating",
              "totalRatings",
            ]),
            nutrients: recipe.nutrients.map((nutrient) =>
              filterObject(nutrient, ["name", "amount", "unit"])
            ),
          })),
        },
        content: [
          {
            type: "text",
            text: `${recipes.length} result(s)\n${recipes
              .map(
                (recipe) =>
                  `Recipe ID: ${recipe.id}\nName: ${recipe.name}\nSummary: ${recipe.summary}`
              )
              .join("\n")}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    `${MCP_NAME}_get_recipe_details`,
    {
      description: "Get detailed information about a recipe by its ID",
      inputSchema: {
        id: z
          .number()
          .int()
          .positive()
          .describe("A unique recipe ID that maps to spoonacular's recipe ID"),
      },
      outputSchema: z.object({
        // Only return fields useful to an LLM to save on context & reduce hallucinations
        id: z.number(),
        name: z.string(),
        url: z.string().url().optional(),
        healthScore: z.number(),
        time: z.number(),
        servings: z.number(),
        summary: z.string(),
        types: z.array(z.enum(MEAL_TYPES)),
        spiceLevel: z.enum(SPICE_LEVELS),
        isVegetarian: z.boolean(),
        isVegan: z.boolean(),
        isGlutenFree: z.boolean(),
        isHealthy: z.boolean(),
        isCheap: z.boolean(),
        isSustainable: z.boolean(),
        culture: z.array(z.enum(CUISINES)),
        nutrients: z.array(
          z.object({
            name: z.string(),
            amount: z.number(),
            unit: z.string(),
          })
        ),
        ingredients: z.array(
          z.object({
            name: z.string(),
            amount: z.number(),
            unit: z.string(),
          })
        ),
        instructions: z.array(
          z.object({
            name: z.string(),
            steps: z.array(
              z.object({
                number: z.number(),
                step: z.string(),
                ingredients: z.array(z.string()),
                equipment: z.array(z.string()),
              })
            ),
          })
        ),
        averageRating: z.number().nullable().optional(),
        totalRatings: z.number().optional(),
        views: z.number().optional(),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) => {
      await server.sendLoggingMessage({
        level: "debug",
        data: `Getting recipe by ID: ${id}`,
      });

      const recipe = await getRecipeById(id);

      if (recipe === null) {
        return {
          content: [
            {
              type: "text",
              text: `A recipe with ID ${id} does not exist.`,
            },
          ],
          isError: true,
        };
      }

      return {
        structuredContent: {
          ...filterObject(recipe, [
            "id",
            "name",
            "url",
            "healthScore",
            "time",
            "servings",
            "summary",
            "types",
            "spiceLevel",
            "isVegetarian",
            "isVegan",
            "isGlutenFree",
            "isHealthy",
            "isCheap",
            "isSustainable",
            "culture",
            "averageRating",
            "totalRatings",
            "views",
          ]),
          nutrients: recipe.nutrients.map((nutrient) =>
            filterObject(nutrient, ["name", "amount", "unit"])
          ),
          ingredients: recipe.ingredients.map((ingredient) =>
            filterObject(ingredient, ["name", "amount", "unit"])
          ),
          instructions: recipe.instructions.map((instruction) => ({
            name: instruction.name,
            steps: instruction.steps.map((step) => ({
              number: step.number,
              step: step.step,
              ingredients: step.ingredients.map(
                (ingredient) => ingredient.name
              ),
              equipment: step.equipment.map((equip) => equip.name),
            })),
          })),
        },
        // For backwards compatibility
        content: [
          {
            type: "text",
            text: `Recipe name: ${recipe.name}\nSummary: ${recipe.summary}\nInstructions: ${recipe.instructions
              .flatMap((instruction) =>
                instruction.steps.map((step) => `${step.number}. ${step.step}`)
              )
              .join("\n")}`,
          },
        ],
      };
    }
  );

  return server;
};

const getMcpServer = () => {
  if (_server === null) {
    _server = createMcpServer();
  }

  return _server;
};

const router = express.Router();

const tokenVerifier: OAuthTokenVerifier = {
  verifyAccessToken: async (token) => {
    try {
      const decodedToken = await FirebaseAdmin.instance.validateToken(token);

      return {
        token,
        clientId: decodedToken.uid,
        scopes: [], // Firebase doesn't use OAuth scopes by default
        expiresAt: decodedToken.exp,
      };
    } catch (error) {
      console.error("[MCP] Failed to validate token:", error);
      throw new Error("Invalid Firebase token provided", { cause: error });
    }
  },
};

const mcpAuth = requireBearerAuth({
  verifier: tokenVerifier,
});

router.post("/", mcpAuth, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  let transport: StreamableHTTPServerTransport;

  if (typeof sessionId === "string" && Object.hasOwn(transports, sessionId)) {
    // Reuse an existing connection
    transport = transports[sessionId];
    console.log(`[MCP] [${sessionId}] Reusing existing MCP connection`);
  } else if (sessionId === undefined && isInitializeRequest(req.body)) {
    // Create a new HTTP session
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports[sessionId] = transport;
        console.log(`[MCP] [${sessionId}] MCP HTTP server initialized`);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId !== undefined) {
        delete transports[transport.sessionId];
        console.log(
          `[MCP] [${transport.sessionId}] MCP HTTP connection closed`
        );
      }
    };

    const server = getMcpServer();
    await server.connect(transport);
    await server.sendLoggingMessage({
      level: "info",
      data: "EZ Recipes MCP Server running on streamable HTTP",
    });
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad Request: No valid session ID provided",
      },
      id: null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

const handleDefaultMcpRequest = async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"];
  if (typeof sessionId !== "string" || !Object.hasOwn(transports, sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

router.get("/", mcpAuth, handleDefaultMcpRequest);
router.delete("/", mcpAuth, handleDefaultMcpRequest);

const main = async () => {
  try {
    const transport = new StdioServerTransport();
    const server = getMcpServer();
    await server.connect(transport);
    await server.sendLoggingMessage({
      level: "info",
      data: "EZ Recipes MCP Server running on stdio",
    });

    if (connection.readyState !== ConnectionStates.connected) {
      await connectToMongoDB();
    }

    transport.onclose = () => {
      disconnectFromMongoDB();
    };
  } catch (error) {
    console.error("Error running MCP from stdio:", error);
  }
};

if (require.main === module) {
  main();
}

export default router;
