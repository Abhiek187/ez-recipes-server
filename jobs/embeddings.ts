import "dotenv/config"; // fetch secrets from .env
import { FeatureExtractionPipeline, pipeline } from "@huggingface/transformers";
import { connection, ConnectionStates, FilterQuery, mongo } from "mongoose";
import os from "os";

import { connectToMongoDB, disconnectFromMongoDB, Indexes } from "../utils/db";
import RecipeModel from "../models/RecipeModel";
import Recipe from "../types/client/Recipe";

/* Workaround to fix type bug:
 * https://github.com/huggingface/transformers.js/issues/1337
 * https://github.com/huggingface/transformers.js/issues/1448
 */
declare module "@huggingface/transformers" {
  export interface MgpstrProcessor {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    batch_decode(...args: any[]): any;
  }
}

export default class Embedding {
  private _embedder?: FeatureExtractionPipeline;

  private static _instance: Embedding;

  static async getInstance() {
    // The pipeline can take a minute to initialize, so pre-warm when needed
    if (this._instance === undefined) {
      this._instance = new this();
    }

    if (this._instance._embedder === undefined) {
      console.log("Initializing the embedding pipeline...");
      await this._instance.initializeEmbeddingPipeline();
    }

    return this._instance;
  }

  /**
   * Initialize the embedding pipeline used for feature extraction
   */
  initializeEmbeddingPipeline = async () => {
    console.time("Initializing pipeline");
    // Need to specify type to fix bug: https://github.com/huggingface/transformers.js/issues/1299
    // If Protobuf parsing fails, try rm -rf node_modules/@huggingface/transformers/.cache
    this._embedder = await pipeline<"feature-extraction">(
      "feature-extraction",
      // https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2 (access token not required)
      "sentence-transformers/all-MiniLM-L6-v2",
      // Render's free tier has a memory limit of 512 MB
      { dtype: "fp32" }
    );
    console.timeEnd("Initializing pipeline");
  };

  /**
   * Generate embeddings (384-dimension vector) using the provided text
   * @param data the string to embed
   * @returns an array of 384 numbers that numerically represents the string
   */
  getEmbedding = async (data: string): Promise<number[]> => {
    if (this._embedder === undefined) return [];

    console.time("Performing feature extraction");
    const results = await this._embedder(data, {
      pooling: "mean",
      normalize: true,
    });
    console.timeEnd("Performing feature extraction");

    return Array.from(results.data);
  };

  /**
   * Generate multiple embeddings
   * @param data an array of strings to embed
   * @returns a 2D array of 32-bit floating numbers that numerically represent each string
   */
  getEmbeddings = async (data: string[]): Promise<Float32Array[]> => {
    if (this._embedder === undefined) return [];

    console.time("Performing feature extraction");
    const results = await this._embedder(data, {
      pooling: "mean",
      normalize: true,
    });
    console.timeEnd("Performing feature extraction");

    // The raw output is flattened, convert to a 2D array
    const dimensions = results.dims[results.dims.length - 1]; // batches x 384
    const flatVector = results.data as Float32Array;

    const embeddings: Float32Array[] = [];
    for (let i = 0; i < flatVector.length; i += dimensions) {
      embeddings.push(flatVector.slice(i, i + dimensions));
    }
    return embeddings;
  };

  /**
   * Generate embeddings in parallel using the provided batch size.
   * @param recipes an array of recipes with a summary field to embed
   * @param batchSize the number of recipes to embed in parallel
   */
  batchGenerateSummaryEmbeddings = async (
    recipes: Recipe[],
    batchSize: number
  ) => {
    console.time("Get embeddings in parallel with batching");
    const batches = Math.ceil(recipes.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const recipeSlice = recipes.slice(
        i * batchSize,
        i * batchSize + batchSize
      );
      const summaries = recipeSlice.map((recipe) => recipe.summary);
      const embeddings = await this.getEmbeddings(summaries);

      recipeSlice.forEach((recipe, index) => {
        // Compress the embedding to BSON (subtype 9) for faster performance and less storage
        // https://www.mongodb.com/docs/manual/reference/bson-types/#binary-data
        const bsonEmbedding = mongo.Binary.fromFloat32Array(embeddings[index]);

        // Add the embedding to an array of update operations
        recipe.summaryEmbedding = bsonEmbedding;
      });

      console.log(`Batch ${i + 1}/${batches} done`);
    }

    console.timeEnd("Get embeddings in parallel with batching");
  };

  /**
   * Add summary embeddings to recipes stored in MongoDB in BSON format
   * @param updateAll if `true`, update the embeddings for all recipes;
   * if `false`, only update recipes that don't have a summary embedding (default: `false`)
   */
  generateEmbeddings = async (updateAll = false) => {
    try {
      if (connection.readyState !== ConnectionStates.connected) {
        await connectToMongoDB();
      }

      const findQuery: FilterQuery<Recipe> = updateAll
        ? {}
        : {
            summaryEmbedding: { $exists: false },
          };
      const recipes = await RecipeModel.find(findQuery).sort({ _id: 1 }).exec();
      console.log(
        `Generating embeddings and updating ${recipes.length} recipes...`
      );

      const batchSize = os.availableParallelism();
      console.log(`Creating embeddings in batches of ${batchSize} (CPU-bound)`);
      await this.batchGenerateSummaryEmbeddings(recipes, batchSize);

      // Update documents with the new embedding field
      // Order doesn't matter, can improve performance slightly
      const result = await RecipeModel.bulkSave(recipes, { ordered: false });
      console.log("Bulk write result:", result);
    } catch (error) {
      console.error("Error creating embeddings:", error);
    }
  };

  /**
   * Do vector search for the given string against all the recipe summaries
   * @param text the string to search for semantically
   */
  semanticSearch = async (text: string) => {
    try {
      if (connection.readyState !== ConnectionStates.connected) {
        await connectToMongoDB();
      }

      const queryVector = await this.getEmbedding(text);
      const result = await RecipeModel.aggregate([
        {
          $vectorSearch: {
            index: Indexes.RecipeSummary,
            queryVector,
            path: "summaryEmbedding",
            exact: true, // Nearest Neighbor search: false = ANN (approx.), true = ENN (exact)
            limit: 5,
          },
        },
        {
          $project: {
            name: 1,
            summary: 1,
            score: {
              $meta: "vectorSearchScore",
            },
          },
        },
      ]).exec();

      console.log(`Search results for ${text}:`, result);
    } catch (error) {
      console.error("Error during semantic search:", error);
    }
  };
}

if (require.main === module) {
  (async () => {
    try {
      console.log("[Cron] Starting embedding job...");
      const embedding = await Embedding.getInstance();
      const updateAll = process.argv[2] === "all";
      await embedding.generateEmbeddings(updateAll);
      // const query = process.argv[2];
      // await embedding.semanticSearch(query ?? "fruity italian dessert");
    } catch (error) {
      console.error("Error running embedding job:", error);
    } finally {
      disconnectFromMongoDB();
      console.log("[Cron] Finished running embedding job");
    }
  })();
}
