import axios from "axios";

import VerifyEmailResponse from "../../types/firebase/VerifyEmailResponse";
import FirebaseTokenResponse from "../../types/firebase/FirebaseTokenResponse";
import FirebaseTokenExchangeResponse from "../../types/firebase/FirebaseTokenExchangeResponse";

const idApi = axios.create({
  baseURL: "https://identitytoolkit.googleapis.com/v1",
  params: {
    key: process.env.WEB_API_KEY,
  },
  signal: new AbortController().signal,
});

const secureApi = axios.create({
  baseURL: "https://securetoken.googleapis.com/v1",
  params: {
    key: process.env.WEB_API_KEY,
  },
  signal: new AbortController().signal,
});

/**
 * Exchange a custom token for an ID & refresh token
 * @param customToken a custom token created by the Firebase Admin SDK
 * @throws `FirebaseRestError` if an error occurred
 * @returns an ID & refresh token
 */
export const exchangeCustomToken = async (
  customToken: string
): Promise<FirebaseTokenExchangeResponse> => {
  const response = await idApi.post<FirebaseTokenExchangeResponse>(
    "/accounts:signInWithCustomToken",
    {
      token: customToken,
      returnSecureToken: true,
    }
  );
  return response.data;
};

/**
 * Send a verification email to the user
 * @param token the Firebase ID token
 * @throws `FirebaseRestError` if an error occurred
 * @returns the email address to verify
 */
export const verifyEmail = async (
  token: string
): Promise<VerifyEmailResponse> => {
  // OOB = out-of-band
  const response = await idApi.post<VerifyEmailResponse>(
    "/accounts:sendOobCode",
    {
      requestType: "VERIFY_EMAIL",
      idToken: token,
    }
  );
  return response.data;
};

/**
 * Get a new ID token using the refresh token
 * @param refreshToken the refresh token
 * @throws `FirebaseRestError` if an error occurred
 * @returns new token information
 */
export const refreshIdToken = async (
  refreshToken: string
): Promise<FirebaseTokenResponse> => {
  const response = await secureApi.post<FirebaseTokenResponse>("/token", {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return response.data;
};
