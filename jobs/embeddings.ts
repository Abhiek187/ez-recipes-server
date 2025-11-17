import "dotenv/config"; // fetch secrets from .env
import { FeatureExtractionPipeline, pipeline } from "@huggingface/transformers";
import { connection, ConnectionStates } from "mongoose";
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

class EmbeddingJobs {
  embedder?: FeatureExtractionPipeline;

  private initializeEmbeddingPipeline = async () => {
    console.time("Initializing pipeline");
    // Need to specify type to fix bug: https://github.com/huggingface/transformers.js/issues/1299
    this.embedder = await pipeline<"feature-extraction">(
      "feature-extraction",
      // https://huggingface.co/nomic-ai/nomic-embed-text-v1.5 (access token not required)
      "nomic-ai/nomic-embed-text-v1.5",
      { dtype: "fp32" }
    );
    console.timeEnd("Initializing pipeline");
  };

  // Generate embeddings (768-dimension vector) using the provided text
  getEmbedding = async (data: string): Promise<number[]> => {
    console.time("Performing feature extraction");
    const results = await this.embedder!(data, {
      pooling: "mean",
      normalize: true,
    });
    console.timeEnd("Performing feature extraction");

    return Array.from(results.data);
  };

  // Generate multiple embeddings
  getEmbeddings = async (data: string[]): Promise<Float32Array[]> => {
    console.time("Performing feature extraction");
    const results = await this.embedder!(data, {
      pooling: "mean",
      normalize: true,
    });
    console.timeEnd("Performing feature extraction");

    // The raw output is flattened, convert to a 2D array
    const dimensions = results.dims[results.dims.length - 1]; // batches x 768
    const flatVector = results.data as Float32Array;

    const embeddings: Float32Array[] = [];
    for (let i = 0; i < flatVector.length; i += dimensions) {
      embeddings.push(flatVector.slice(i, i + dimensions));
    }
    return embeddings;
  };

  getEmbeddingsInParallelWithBatching = async (
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
        // Compress the embedding to BSON for faster performance and less storage
        const bsonEmbedding = Buffer.from(embeddings[index].buffer);

        // Add the embedding to an array of update operations
        recipe.summaryEmbedding = bsonEmbedding;
      });

      console.log(`Batch ${i + 1}/${batches} done`);
    }

    console.timeEnd("Get embeddings in parallel with batching");
  };

  addEmbeddings = async () => {
    try {
      if (connection.readyState !== ConnectionStates.connected) {
        await connectToMongoDB();
      }

      const recipes = await RecipeModel.find({ id: "663849" })
        .sort({ _id: 1 })
        .exec();
      console.log(
        `Generating embeddings and updating ${recipes.length} recipes...`
      );

      await this.initializeEmbeddingPipeline();

      // const batchSize = os.cpus().length * 2; // 2 threads per core
      const batchSize = os.availableParallelism();
      console.log(`Creating embeddings in batches of ${batchSize} (CPU-bound)`);
      await this.getEmbeddingsInParallelWithBatching([...recipes], batchSize);

      // Update documents with the new embedding field
      // Order doesn't matter, can improve performance slightly
      const result = await RecipeModel.bulkSave(recipes, { ordered: false });
      console.log("Bulk write result:" + result);
    } catch (error) {
      console.error("Error creating embeddings:", error);
    }
  };

  semanticSearch = async (text: string) => {
    try {
      await this.initializeEmbeddingPipeline();
      const queryVector = await this.getEmbedding(text);
      console.time("Vector search");
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
      console.timeEnd("Vector search");

      console.log(`Search results for ${text}:`, result);
    } catch (error) {
      console.error("Error during semantic search:", error);
    }
  };
}

if (require.main === module) {
  const embeddingJobs = new EmbeddingJobs();
  // embeddingJobs
  //   .addEmbeddings()
  //   .catch(console.error)
  //   .finally(disconnectFromMongoDB);
  embeddingJobs
    .semanticSearch("fruity italian dessert")
    .catch(console.error)
    .finally(disconnectFromMongoDB);
}
