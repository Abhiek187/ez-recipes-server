// Need to enable allowSyntheticDefaultImports
import { initializeApp } from "firebase-admin/app";
import { getAuth, UserRecord } from "firebase-admin/auth";

import { createChef, deleteChef, saveRefreshToken } from "../db";
import UserInfoResponse from "../../types/firebase/UserInfoResponse";
import FirebaseApi from "./api";

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
   * @returns the user's UID (unique ID), ID token, and whether the email is verified
   */
  async createUser(email: string, password: string): Promise<UserInfoResponse> {
    const auth = getAuth();
    // New users must verify their emails
    const emailVerified = false;
    const userRecord = await auth.createUser({
      email,
      emailVerified,
      password,
      disabled: false,
    });
    const uid = userRecord.uid;
    await createChef(userRecord.uid, email);
    // Save the refresh token after creating a new chef doc
    const idToken = await this.getIdToken(uid);

    console.log("Successfully created a new user:", userRecord);
    return {
      uid,
      token: idToken,
      emailVerified,
    };
  }

  /**
   * Get an ID token for a given user & store the refresh token
   * @param uid the unique ID of the user
   * @throws `FirebaseAuthError` if an error occurred
   * @returns an ID token
   */
  async getIdToken(uid: string): Promise<string> {
    const auth = getAuth();
    const customToken = await auth.createCustomToken(uid);
    const { idToken, refreshToken } =
      await FirebaseApi.instance.exchangeCustomToken(customToken);
    await saveRefreshToken(uid, refreshToken);
    return idToken;
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
   * Log out the user by revoking their tokens
   * @param uid the unique ID of the user
   * @throws `FirebaseAuthError` if an error occurred
   */
  async logoutUser(uid: string) {
    const auth = getAuth();
    await auth.revokeRefreshTokens(uid);

    console.log(`Revoked refresh tokens for user ${uid}`);
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
