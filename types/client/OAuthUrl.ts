import OAuthProvider from "./OAuthProvider";

type OAuthUrl = {
  providerId: OAuthProvider;
  authUrl: string;
};

export default OAuthUrl;
