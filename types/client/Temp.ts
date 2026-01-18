type Temp = {
  _id: string;
  createdAt: Date; // required to setup TTL
  // Passkey challenge data
  challenge?: string;
  webAuthnUserID?: string;
};

export default Temp;
