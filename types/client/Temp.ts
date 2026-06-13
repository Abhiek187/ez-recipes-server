type Temp = {
  _id: string;
  expiresAt: Date; // required to setup TTL
  challenge?: string; // passkey/PKCE challenge data
};

export default Temp;
