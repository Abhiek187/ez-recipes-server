import OAuthProvider from "../client/OAuthProvider";

type FirebaseIdpResponse = {
  federatedId: string;
  providerId: OAuthProvider;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  fullName?: string;
  lastName?: string;
  photoUrl?: string;
  localId?: string; // UID
  displayName?: string;
  verifiedProvider?: OAuthProvider[];
  needConfirmation?: boolean;
  idToken?: string; // the Firebase token
  refreshToken?: string;
  expiresIn?: string;
  oauthAccessToken?: string; // the original OAuth access token
  oauthIdToken?: string; // the original OAuth ID token
  screenName?: string;
  rawUserInfo: string;
  isNewUser?: boolean;
  // Only present if FEDERATED_USER_ID_ALREADY_LINKED or EMAIL_EXISTS occurred
  errorMessage?: string;
  kind: string;
};

export default FirebaseIdpResponse;
