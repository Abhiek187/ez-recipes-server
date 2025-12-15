import OAuthProvider from "../client/OAuthProvider";

type FirebaseIdpResponse = {
  federatedId: string;
  providerId: OAuthProvider;
  email: string;
  emailVerified: boolean;
  photoUrl: string;
  localId?: string; // UID
  idToken?: string; // the Firebase token
  refreshToken?: string;
  expiresIn?: string;
  oauthIdToken: string; // the original OAuth token
  rawUserInfo: string;
  isNewUser?: boolean;
  // Only present if FEDERATED_USER_ID_ALREADY_LINKED or EMAIL_EXISTS occurred
  errorMessage?: string;
  kind: string;
};

export default FirebaseIdpResponse;
