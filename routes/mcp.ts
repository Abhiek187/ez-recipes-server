import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod/v3";

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
        .string()
        .describe("A unique recipe ID that maps to spoonacular's recipe ID"),
    },
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

    if (id.trim().length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Invalid recipe ID",
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: "Placeholder for recipe output",
        },
      ],
    };
  }
);

const main = async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  await server.sendLoggingMessage({
    level: "info",
    data: "EZ Recipes MCP Server running on stdio",
  });
};

// Sample test: {"jsonrpc":"2.0","id":1,"method":"tools/list"}
if (require.main === module) {
  main();
}
