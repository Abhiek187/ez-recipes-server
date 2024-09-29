// Need to enable allowSyntheticDefaultImports
import { initializeApp } from "firebase-admin/app";
import { getAuth, UserRecord } from "firebase-admin/auth";

import { createChef, deleteChef } from "../db";

export default class FirebaseAdmin {
  private static _instance: FirebaseAdmin; // singleton

  private constructor() {
    // Initialize the Firebase Admin SDK using the default config
    initializeApp();
    console.log("Initialized the Firebase Admin SDK");
  }

  static get instance() {
    if (this._instance === undefined) {
      this._instance = new this();
    }

    return this._instance;
  }

  /**
   * Create a new user in Firebase and save it to MongoDB
   * @param email the user's email
   * @param password the user's password
   * @throws `FirebaseAuthError` if an error occurred
   * @returns the user's UID (unique ID)
   */
  async createUser(email: string, password: string): Promise<string> {
    const auth = getAuth();
    const userRecord = await auth.createUser({
      email,
      emailVerified: false,
      password,
      disabled: false,
    });
    await createChef(userRecord.uid, email);

    console.log("Successfully created a new user:", userRecord);
    return userRecord.uid;
  }

  /**
   * Validate a Firebase ID token and check if it's revoked
   * @param token the ID token to validate
   * @throws `FirebaseAuthError` if an error occurred
   * @returns the UID from the token
   */
  async validateToken(token: string): Promise<string> {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token, true);
    return decodedToken.uid;
  }

  /**
   * Get the user's profile
   * @param uid the unique ID of the user
   * @throws `FirebaseAuthError` if an error occurred
   * @returns an object containing user data
   */
  async getUser(uid: string): Promise<UserRecord> {
    const auth = getAuth();
    return await auth.getUser(uid);
  }

  /**
   * Delete a user from Firebase & MongoDB, if it exists
   * @param uid the unique ID of the user
   * @throws `FirebaseAuthError` if an error occurred
   */
  async deleteUser(uid: string) {
    const auth = getAuth();
    await auth.deleteUser(uid);
    await deleteChef(uid);

    console.log(`Successfully deleted user ${uid}`);
  }
}
