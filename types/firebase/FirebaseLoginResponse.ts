type FirebaseLoginResponse = {
  kind: string;
  localId: string; // UID
  email: string;
  displayName: string;
  idToken: string;
  registered: boolean;
  refreshToken: string;
  expiresIn: string;
};

export default FirebaseLoginResponse;
