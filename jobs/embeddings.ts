import "dotenv/config"; // fetch secrets from .env
import { FeatureExtractionPipeline, pipeline } from "@xenova/transformers";
import { connection, ConnectionStates } from "mongoose";
import os from "os";

import { connectToMongoDB, disconnectFromMongoDB } from "../utils/db";
import RecipeModel from "../models/RecipeModel";
import Recipe from "../types/client/Recipe";

class EmbeddingJobs {
  embedder?: FeatureExtractionPipeline;

  private initializeEmbeddingPipeline = async () => {
    console.time("Initializing pipeline");
    this.embedder = await pipeline(
      "feature-extraction",
      // https://huggingface.co/Xenova/nomic-embed-text-v1 (access token not required)
      "Xenova/nomic-embed-text-v1"
    );
    console.timeEnd("Initializing pipeline");
  };

  // Generate embeddings (768-dimension vector) using the provided text
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

      const recipes = await RecipeModel.find({}).sort({ _id: 1 }).exec();
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
      // const result = await RecipeModel.bulkSave(recipes, { ordered: false });
      // console.log("Count of documents updated: " + result.modifiedCount);
    } catch (error) {
      console.error("Error creating embeddings:", error);
    } finally {
      disconnectFromMongoDB();
    }
  };
}

if (require.main === module) {
  const embeddingJobs = new EmbeddingJobs();
  embeddingJobs.addEmbeddings().catch(console.error);
}
