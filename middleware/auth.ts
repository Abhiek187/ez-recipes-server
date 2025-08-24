import { NextFunction, Request, Response } from "express";
import { AuthClientErrorCode, FirebaseAuthError } from "firebase-admin/auth";
import { jwtDecode } from "jwt-decode";

import FirebaseAdmin from "../utils/auth/admin";
import FirebaseApi from "../utils/auth/api";
import { getRefreshToken, saveRefreshToken } from "../utils/db";
import { BASE_COOKIE_OPTIONS, COOKIE_2_WEEKS, COOKIES } from "../utils/cookie";

const saveTokenAndContinue = (
  res: Response,
  next: NextFunction,
  uid: string,
  token: string
) => {
  // Save the UID & token for requests that need it
  res.locals.uid = uid;
  res.locals.token = token;
  res.cookie(COOKIES.ID_TOKEN, token, COOKIE_2_WEEKS);
  next();
};

const auth = async (req: Request, res: Response, next: NextFunction) => {
  // Validate the ID token from Firebase
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith("Bearer ")
    ? authHeader.split("Bearer ")[1]
    : authHeader;
  // If no token is passed in the auth header, check for a cookie
  if (token === undefined) {
    token = req.cookies?.[COOKIES.ID_TOKEN];
  }

  const isResettingPassword =
    ["/api/chefs", "/api/chefs/"].includes(req.originalUrl) &&
    req.method === "PATCH" &&
    req.body?.type === "password" &&
    req.body?.password === undefined;
  const isViewingRecipe =
    req.originalUrl.startsWith("/api/recipes/") &&
    req.params.id !== undefined &&
    req.method === "PATCH" &&
    typeof req.body?.view === "boolean";

  if (token === undefined) {
    // Skip validation for certain requests
    if (isResettingPassword || isViewingRecipe) {
      next();
    } else {
      res
        .status(401)
        .json({ error: "Missing the Firebase ID token from the request" });
    }

    return;
  }

  try {
    const uid = await FirebaseAdmin.instance.validateToken(token);
    saveTokenAndContinue(res, next, uid, token);
  } catch (err) {
    const error = err as FirebaseAuthError;

    // If the token is expired, try refreshing it (revoked tokens can't be refreshed)
    // The token could also be expired if the kid claim is invalid
    // (but don't check for auth/argument-error)
    if (
      error.code === `auth/${AuthClientErrorCode.ID_TOKEN_EXPIRED.code}` ||
      error.message?.includes("expired")
    ) {
      try {
        // Need to decode the token ourself since Firebase won't accept expired tokens
        // Assuming the rest of the token is valid, and a new token will be generated anyway
        const { sub: uid } = jwtDecode(token);
        if (uid === undefined) {
          throw new Error("UID not found in the token");
        }

        const refreshToken = await getRefreshToken(uid);
        if (refreshToken === null) {
          throw new Error(`Couldn't find a refresh token for user: ${uid}`);
        }

        // newUid should === uid, but better to be safe than sorry
        const {
          id_token: newIdToken,
          refresh_token: newRefreshToken,
          user_id: newUid,
        } = await FirebaseApi.instance.refreshIdToken(refreshToken);

        await saveRefreshToken(newUid, newRefreshToken);
        saveTokenAndContinue(res, next, newUid, newIdToken);
        return;
      } catch (error2) {
        console.error(`Failed to refresh the ID token: ${error2}`);
      }
    }

    res.clearCookie(COOKIES.ID_TOKEN, BASE_COOKIE_OPTIONS);
    res
      .status(401)
      .json({ error: `Invalid Firebase token provided: ${error}` });
  }
};

export default auth;
