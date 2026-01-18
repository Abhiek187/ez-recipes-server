import type {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
} from "@simplewebauthn/server";

type Passkey = {
  webAuthnUserID?: string; // user ID (different from the UID)
  id: string; // credential ID
  publicKey: Uint8Array<ArrayBuffer>;
  // The number of times the authenticator has been used
  counter: number;
  // How an authenticator can be used:
  // https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAttestationResponse/getTransports#return_value
  transports?: AuthenticatorTransportFuture[];
  deviceType: CredentialDeviceType;
  backedUp: boolean;
};

export default Passkey;
