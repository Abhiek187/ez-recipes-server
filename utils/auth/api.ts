import axios, { AxiosInstance } from "axios";

import OobCodeResponse from "../../types/firebase/OobCodeResponse";
import FirebaseTokenResponse from "../../types/firebase/FirebaseTokenResponse";
import FirebaseTokenExchangeResponse from "../../types/firebase/FirebaseTokenExchangeResponse";
import FirebaseLoginResponse from "../../types/firebase/FirebaseLoginResponse";

export default class FirebaseApi {
  private static _instance: FirebaseApi;
  private idApi: AxiosInstance;
  private secureApi: AxiosInstance;

  private constructor() {
    this.idApi = axios.create({
      baseURL: "https://identitytoolkit.googleapis.com/v1",
      params: {
        key: process.env.WEB_API_KEY,
      },
      signal: new AbortController().signal,
    });

    this.secureApi = axios.create({
      baseURL: "https://securetoken.googleapis.com/v1",
      params: {
        key: process.env.WEB_API_KEY,
      },
      signal: new AbortController().signal,
    });
  }

  static get instance() {
    if (this._instance === undefined) {
      this._instance = new this();
    }

    return this._instance;
  }

  /**
   * Exchange a custom token for an ID & refresh token
   * @param customToken a custom token created by the Firebase Admin SDK
   * @throws `FirebaseRestError` if an error occurred
   * @returns an ID & refresh token
   */
  async exchangeCustomToken(
    customToken: string
  ): Promise<FirebaseTokenExchangeResponse> {
    const response = await this.idApi.post<FirebaseTokenExchangeResponse>(
      "/accounts:signInWithCustomToken",
      {
        token: customToken,
        returnSecureToken: true,
      }
    );
    return response.data;
  }

  /**
   * Login the user using their email and password
   * @param email the user's email
   * @param password the user's password
   * @throws `FirebaseRestError` if an error occurred
   * @returns the user's UID, tokens, and other information
   */
  async login(email: string, password: string): Promise<FirebaseLoginResponse> {
    const response = await this.idApi.post<FirebaseLoginResponse>(
      "/accounts:signInWithPassword",
      {
        email,
        password,
        returnSecureToken: true,
      }
    );
    return response.data;
  }

  /**
   * Send a verification email to the user
   * @param token the Firebase ID token
   * @throws `FirebaseRestError` if an error occurred
   * @returns the email address to verify
   */
  async verifyEmail(token: string): Promise<OobCodeResponse> {
    // OOB = out-of-band
    const response = await this.idApi.post<OobCodeResponse>(
      "/accounts:sendOobCode",
      {
        requestType: "VERIFY_EMAIL",
        idToken: token,
      }
    );
    return response.data;
  }

  /**
   * Send an email to reset the user's password
   * @param email the email address to send the notification
   * @throws `FirebaseRestError` if an error occurred
   * @returns the email address sent to
   */
  async resetPassword(email: string): Promise<OobCodeResponse> {
    const response = await this.idApi.post<OobCodeResponse>(
      "/accounts:sendOobCode",
      {
        requestType: "PASSWORD_RESET",
        email,
      }
    );
    return response.data;
  }

  /**
   * Send an email to confirm a new email address
   * @param email the new email address to verify
   * @param token the Firebase ID token
   * @throws `FirebaseRestError` if an error occurred
   * @returns the email address to verify
   */
  async changeEmail(email: string, token: string): Promise<OobCodeResponse> {
    // Documented in Identity Platform, but not in Firebase
    const response = await this.idApi.post<OobCodeResponse>(
      "/accounts:sendOobCode",
      {
        requestType: "VERIFY_AND_CHANGE_EMAIL",
        newEmail: email,
        idToken: token,
      }
    );
    return response.data;
  }

  /**
   * Get a new ID token using the refresh token
   * @param refreshToken the refresh token
   * @throws `FirebaseRestError` if an error occurred
   * @returns new token information
   */
  async refreshIdToken(refreshToken: string): Promise<FirebaseTokenResponse> {
    const response = await this.secureApi.post<FirebaseTokenResponse>(
      "/token",
      {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }
    );
    return response.data;
  }
}
