import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import fs from "fs";

/**
 * Initialize the Firebase Client SDK
 */
export const connectToFirebase = () => {
  const firebaseConfigStr = fs.readFileSync(
    `${process.env.FIREBASE_CONFIG}`,
    "utf-8"
  );
  const firebaseConfig = JSON.parse(firebaseConfigStr);
  initializeApp(firebaseConfig);
  console.log("Initialized the Firebase Client SDK");
};

/**
 * Sign in to Firebase with the provided credentials
 * @param email the user's email
 * @param password the user's password
 * @throws `AuthError` if an error occurred
 * @returns an object containing the user's UID and ID token
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<{ uid: string; token: string }> => {
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
};

/**
 * Sign out of Firebase
 * @throws `AuthError` if an error occurred
 */
export const logoutUser = async () => {
  const auth = getAuth();
  await signOut(auth);

  console.log("Signed out successfully");
};
