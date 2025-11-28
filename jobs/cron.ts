import "dotenv/config"; // fetch secrets from .env
import { FirebaseAuthError } from "firebase-admin/auth";
import { connection, ConnectionStates } from "mongoose";
import cron from "node-cron";

import FirebaseAdmin from "../utils/auth/admin";
import { isAtLeastDaysOld } from "../utils/string";
import { connectToMongoDB, disconnectFromMongoDB } from "../utils/db";
import { generateSummaryEmbeddings } from "./embeddings";

export default class CronJobs {
  constructor(isMainScript = false) {
    // Don't run cron jobs if running the script directly so it doesn't hang
    if (isMainScript) {
      this.deleteInactiveAccounts();
      return;
    }

    //             .---------------- minute (0 - 59)
    //             | .-------------- hour (0 - 23)
    //             | | .------------ day of month (1 - 31)
    //             | | | .---------- month (1 - 12) OR jan,feb,mar,apr ...
    //             | | | | .-------- day of week (0 - 6) (Sunday=0 or 7) OR sun-sat
    //             | | | | |
    cron.schedule("0 0 * * *", this.deleteInactiveAccounts, {
      name: "Delete inactive accounts job",
    });

    // Run a cron job within the Node process so the embedder stays in memory
    cron.schedule("1 0 * * *", generateSummaryEmbeddings, {
      name: "Generate embeddings job",
    });

    console.log("Configured cron jobs");
  }

  async deleteInactiveAccounts() {
    // Delete accounts with unverified emails after 1 week
    console.log("[Cron] Starting deleteInactiveAccounts job...");

    try {
      const users = await FirebaseAdmin.instance.getAllUsers();

      for (const user of users) {
        const { uid, emailVerified, metadata } = user;

        // Metadata times are in UTC string format
        if (!emailVerified && isAtLeastDaysOld(metadata.creationTime, 7)) {
          if (connection.readyState !== ConnectionStates.connected) {
            await connectToMongoDB();
          }

          await FirebaseAdmin.instance.deleteUser(uid);
        }
      }

      console.log("[Cron] deleteInactiveAccounts ran successfully");
    } catch (err) {
      const error = err as FirebaseAuthError;
      console.error("Error deleting inactive users:", error);
    } finally {
      if (require.main === module) {
        disconnectFromMongoDB();
      }
    }
  }
}

if (require.main === module) {
  new CronJobs(true);
}
