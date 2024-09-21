// Need to enable allowSyntheticDefaultImports
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Initialize the Firebase Admin SDK using the default config
 */
export const connectToFirebase = () => {
  initializeApp();
  console.log("Initialized the Firebase Admin SDK");
};

/**
 * Create a new user in Firebase using the provided credentials
 * @param email the user's email
 * @param password the user's password
 * @throws `FirebaseAuthError` if an error occurred
 * @returns the user's UID (unique ID)
 */
export const createUser = async (
  email: string,
  password: string
): Promise<string> => {
  const auth = getAuth();
  const userRecord = await auth.createUser({
    email,
    emailVerified: false,
    password,
    disabled: false,
  });

  console.log("Successfully created new user:", userRecord);
  return userRecord.uid;
};

/**
 * Delete a user from Firebase, if it exists
 * @param uid the unique ID of the user
 * @throws `FirebaseAuthError` if an error occurred
 */
export const deleteUser = async (uid: string) => {
  const auth = getAuth();
  await auth.deleteUser(uid);

  console.log(`Successfully deleted user ${uid}`);
};
