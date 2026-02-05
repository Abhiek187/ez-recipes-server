import { PasskeyAAGUIDResponse } from "../../types/client/Passkey";
import createAxios from "../axios";

export const RelyingParty = {
  NAME: "EZ Recipes Web",
  ID: "ez-recipes-web.onrender.com", // should be part of the web origin
  // All the clients that support passkeys (prevents phishing)
  ORIGINS: [
    "https://ez-recipes-web.onrender.com",
    "ios:bundle-id:com.abhiek.EZ-Recipes",
    "android:apk-key-hash:8Znu2G7b5SsIboIQ0fVbK8Zofk9F6_W8NXhKqHZ83uk", // debug fingerprint
    "android:apk-key-hash:ZuHdlL_PLiSrXs3LMCp4tCmImpkYuQOJXcX-sMsa3og", // release fingerprint
  ],
};

// Community-driven AAGUID list, may be removed at any point:
// https://github.com/passkeydeveloper/passkey-authenticator-aaguids/tree/main
const aaguidApi = createAxios({
  baseURL:
    "https://raw.githubusercontent.com/passkeydeveloper/passkey-authenticator-aaguids/refs/heads/main/combined_aaguid.json",
  signal: new AbortController().signal,
});

// Simple cache that resets when the server spins down
let aaguidCache: PasskeyAAGUIDResponse = {};

/**
 * Fetch user-friendly information about a passkey based on its AAGUID
 * (Authenticator Attestation Global Unique Identifier)
 * @param aaguid the AAGUID of the passkey
 * @returns user-friendly data about the passkey, or `undefined` if no info could be found
 */
export const getPasskeyInfo = async (
  aaguid: string
): Promise<
  | {
      name: string;
      iconLight?: string;
      iconDark?: string;
    }
  | undefined
> => {
  try {
    let passkeyInfo = aaguidCache[aaguid];
    if (passkeyInfo === undefined) {
      // Cache miss: call the real API (downloads MBs of data)
      const allPasskeys = await aaguidApi.get<PasskeyAAGUIDResponse>("");
      aaguidCache = allPasskeys.data ?? {};
      passkeyInfo = allPasskeys.data?.[aaguid];

      if (passkeyInfo === undefined) {
        return undefined;
      }
    }

    // Normalize the response
    return {
      name: passkeyInfo.name,
      iconLight: passkeyInfo.icon_light ?? undefined,
      iconDark: passkeyInfo.icon_dark ?? undefined,
    };
  } catch (error) {
    console.warn(`Failed to get passkey info with AAGUID ${aaguid}:`, error);
    return undefined;
  }
};
