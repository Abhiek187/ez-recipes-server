import "dotenv/config"; // fetch secrets from .env
import { FirebaseAuthError } from "firebase-admin/auth";
import { connection, ConnectionStates } from "mongoose";

import FirebaseAdmin from "../utils/auth/admin";
import { isAtLeastDaysOld } from "../utils/string";
import { connectToMongoDB, disconnectFromMongoDB } from "../utils/db";

class CronJobs {
  constructor() {
    this.deleteInactiveAccounts();
  }

  async deleteInactiveAccounts() {
    // Delete accounts with unverified emails after 1 week
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

      console.log("Cron deleteInactiveAccounts ran successfully");
    } catch (err) {
      const error = err as FirebaseAuthError;
      console.error("Error deleting inactive users:", error);
    } finally {
      disconnectFromMongoDB();
    }
  }
}

new CronJobs();
