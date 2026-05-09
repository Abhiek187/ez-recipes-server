import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { OAuthTokenVerifier } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";
import z from "zod/v3";

import FirebaseAdmin from "../utils/auth/admin";
import { getRecipeById } from "../utils/db";
import { CUISINES, MEAL_TYPES, SPICE_LEVELS } from "../types/client/Recipe";
import { filterObject } from "../utils/object";

const MCP_NAME = "ez-recipes";

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
        .describe(
          "An full-text query to search recipes by name or description"
        ),
    },
    annotations: {
      readOnlyHint: true, // only reads data
      destructiveHint: false, // no write actions, so reversible
      idempotentHint: true, // can be called multiple times with consistent results
      openWorldHint: false, // doesn't interact with the open internet (constrained to MongoDB database)
    },
  },
  async ({ query }) => {
    await server.sendLoggingMessage({
      level: "debug",
      data: `Searching recipes using the following query: ${query}`,
    });

    return {
      content: [
        {
          type: "text",
          text: "Placeholder for search output",
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
            ingredients: step.ingredients.map((ingredient) => ingredient.name),
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
      console.error("Failed to validate token:", error);
      throw new Error("Invalid Firebase token provided", { cause: error });
    }
  },
};

const mcpAuth = requireBearerAuth({
  verifier: tokenVerifier,
});

router.post("/", mcpAuth, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  console.log("MCP session ID:", sessionId);

  if (isInitializeRequest(req.body)) {
    console.log("MCP HTTP server initialized");
  }

  const transport = new StreamableHTTPServerTransport();
  if (server.isConnected()) {
    console.warn("Closing existing transport connection");
    await server.close();
  }
  await server.connect(transport);
  await server.sendLoggingMessage({
    level: "info",
    data: "EZ Recipes MCP Server running on streamable HTTP",
  });

  await transport.handleRequest(req, res, req.body);
});

const handleDefaultMcpRequest = async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport();
  await transport.handleRequest(req, res);
};
router.get("/", mcpAuth, handleDefaultMcpRequest);
router.delete("/", mcpAuth, handleDefaultMcpRequest);

const main = async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  await server.sendLoggingMessage({
    level: "info",
    data: "EZ Recipes MCP Server running on stdio",
  });
};

if (require.main === module) {
  main();
}

export default router;
