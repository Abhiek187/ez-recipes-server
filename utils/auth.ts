// Need to enable allowSyntheticDefaultImports
import { initializeApp } from "firebase-admin/app";
import { FirebaseAuthError, getAuth } from "firebase-admin/auth";

/**
 * Initialize the Firebase Admin SDK using the default config
 */
export const connectToFirebase = () => {
  initializeApp();
  console.log("Initialized Firebase");
};

/**
 * Create a new user in Firebase using the provided credentials
 * @param email the user's email
 * @param password the user's password
 * @returns the error message if an error occurred, or `undefined` otherwise
 */
export const createUser = async (
  email: string,
  password: string
): Promise<string | undefined> => {
  const auth = getAuth();

  try {
    const userRecord = await auth.createUser({
      email,
      emailVerified: false,
      password,
      disabled: false,
    });
    console.log("Successfully created new user:", userRecord);
    return undefined;
  } catch (err) {
    const error = err as FirebaseAuthError;
    console.error("Error creating new user:", error);
    return error.message;
  }
};

/**
 * Delete a user from Firebase, if it exists
 * @param uid the unique ID of the user
 * @returns the error message if an error occurred, or `undefined` otherwise
 */
export const deleteUser = async (uid: string): Promise<string | undefined> => {
  const auth = getAuth();

  try {
    await auth.deleteUser(uid);
    console.log(`Successfully deleted user ${uid}`);
    return undefined;
  } catch (err) {
    const error = err as FirebaseAuthError;
    console.error("Error deleting user:", error);
    return error.message;
  }
};
