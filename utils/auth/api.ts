import axios from "axios";

import VerifyEmailResponse from "../../types/firebase/VerifyEmailResponse";

const api = axios.create({
  baseURL: "https://identitytoolkit.googleapis.com/v1",
  params: {
    key: process.env.WEB_API_KEY,
  },
  signal: new AbortController().signal,
});

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
  const response = await api.post<VerifyEmailResponse>(
    "/accounts:sendOobCode",
    {
      requestType: "VERIFY_EMAIL",
      idToken: token,
    }
  );
  return response.data;
};
