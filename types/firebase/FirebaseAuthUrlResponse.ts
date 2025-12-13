import OAuthProvider from "../client/OAuthProvider";

type FirebaseAuthUrlResponse = {
  kind: string;
  authUri: string;
  providerId: OAuthProvider;
  forExistingProvider: boolean;
  sessionId: string;
};

export default FirebaseAuthUrlResponse;
