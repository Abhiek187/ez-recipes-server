import OAuthProvider from "../../types/client/OAuthProvider";

export const OAuthConfig: Record<
  OAuthProvider,
  {
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
  }
> = {
  [OAuthProvider.GOOGLE]: {
    clientId:
      "156243435971-5msklqde4dpn0b0bs2g2nsj1svijvpsr.apps.googleusercontent.com",
    clientSecret: `${process.env.CLIENT_SECRET_GOOGLE}`,
    tokenUrl: "https://oauth2.googleapis.com/token",
  },
  [OAuthProvider.FACEBOOK]: {
    clientId: "1924319198430849",
    clientSecret: `${process.env.CLIENT_SECRET_FACEBOOK}`,
    tokenUrl: "https://graph.facebook.com/v24.0/oauth/access_token",
  },
  [OAuthProvider.GITHUB]: {
    clientId: "Iv23liAfZdufhzrYKyf6",
    clientSecret: `${process.env.CLIENT_SECRET_GITHUB}`,
    tokenUrl: "https://github.com/login/oauth/access_token",
  },
  [OAuthProvider.MICROSOFT]: {
    clientId: "2a96f11b-45c7-4d7c-9426-5a60bc5f4fc3",
    clientSecret: `${process.env.CLIENT_SECRET_MICROSOFT}`,
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  },
};

export const ERROR_USER_ALREADY_EXISTS = "FEDERATED_USER_ID_ALREADY_LINKED";
export const ERROR_EMAIL_EXISTS = "EMAIL_EXISTS";
