import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import fs from "fs";

export default class FirebaseClient {
  private static _instance: FirebaseClient; // singleton

  private constructor() {
    // Initialize the Firebase Client SDK
    const firebaseConfigStr = fs.readFileSync(
      `${process.env.FIREBASE_CONFIG}`,
      "utf8"
    );
    const firebaseConfig = JSON.parse(firebaseConfigStr);
    initializeApp(firebaseConfig);
    console.log("Initialized the Firebase Client SDK");
  }

  static get instance() {
    if (this._instance === undefined) {
      this._instance = new this();
    }

    return this._instance;
  }

  /**
   * Sign in to Firebase with the provided credentials
   * @param email the user's email
   * @param password the user's password
   * @throws `AuthError` if an error occurred
   * @returns an object containing the user's UID and ID token
   */
  async loginUser(
    email: string,
    password: string
  ): Promise<{ uid: string; token: string }> {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    console.log("Signed in:", userCredential);
    const token = await userCredential.user.getIdToken();

    return {
      uid: userCredential.user.uid,
      token,
    };
  }

  /**
   * Sign out of Firebase
   * @throws `AuthError` if an error occurred
   */
  async logoutUser() {
    const auth = getAuth();
    await signOut(auth);

    console.log("Signed out successfully");
  }
}
