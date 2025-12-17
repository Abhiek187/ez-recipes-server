import { isAxiosError } from "axios";
import express from "express";
import { body, query, validationResult } from "express-validator";
import { Request } from "express-validator/lib/base";
import { FirebaseAuthError } from "firebase-admin/auth";

import FirebaseAdmin from "../utils/auth/admin";
import auth from "../middleware/auth";
import FirebaseApi from "../utils/auth/api";
import FirebaseRestError, {
  isFirebaseRestError,
} from "../types/firebase/FirebaseRestError";
import { handleAxiosError } from "../utils/api";
import { createChef, getChef, saveRefreshToken } from "../utils/db";
import { filterObject } from "../utils/object";
import { BASE_COOKIE_OPTIONS, COOKIE_2_WEEKS, COOKIES } from "../utils/cookie";
import OAuthProvider from "../types/client/OAuthProvider";

const checkValidations = (req: Request, res: express.Response) => {
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    const errorMessages = validationErrors.array().map((error) => error.msg);
    res
      .status(400)
      .json({ error: `Invalid request: ${errorMessages.join(" | ")}` });
  }
};

const handleFirebaseRestError = (
  prefix: string,
  error: unknown,
  res: express.Response
) => {
  if (isAxiosError(error) && isFirebaseRestError(error.response?.data)) {
    const { code, message } = error.response.data.error;
    res.status(code).json({ error: `${prefix}: ${message}` });
  } else if (isAxiosError(error)) {
    const [status, json] = handleAxiosError(error);
    res.status(status).json(json);
  } else {
    res.status(500).json({
      error: `${prefix}: ${JSON.stringify(
        error,
        Object.getOwnPropertyNames(error)
      )}`,
    });
  }
};

const router = express.Router();

router.get("/", auth, async (_req, res) => {
  // Get the user's profile
  const { token, uid } = res.locals;
  const chef = await getChef(uid);

  if (chef === null) {
    // Shouldn't normally occur, unless MongoDB is out-of-sync with Firebase
    res.status(404).json({ error: `Chef with UID ${uid} not found` });
    return;
  }

  try {
    const userRecord = await FirebaseAdmin.instance.getUser(uid);
    res.status(200).json({
      uid,
      ...filterObject(userRecord, ["email", "emailVerified"]),
      ...filterObject(chef, ["ratings", "recentRecipes", "favoriteRecipes"]),
      token,
    });
  } catch (err) {
    const error = err as FirebaseAuthError;
    console.error("Error fetching the user's profile:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post(
  "/",
  body().isObject().withMessage("Body is missing or not an object"),
  body("email").isEmail().withMessage("Invalid/missing email"),
  body("password")
    .isString()
    .withMessage("Password must be a string")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  async (req, res) => {
    // Create an account
    checkValidations(req, res);
    if (res.writableEnded) return;

    const { email, password } = req.body;

    try {
      const userInfo = await FirebaseAdmin.instance.createUser(email, password);
      res.cookie(COOKIES.ID_TOKEN, userInfo.token, COOKIE_2_WEEKS);
      res.status(201).json(userInfo);
    } catch (err) {
      const error = err as FirebaseAuthError;
      console.error("Error creating a new user:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

router.patch(
  "/",
  body().isObject().withMessage("Body is missing or not an object"),
  body("type")
    .isIn(["email", "password"])
    .withMessage("Change type must be 'email' or 'password'"),
  body("email").isEmail().withMessage("Invalid email"),
  // Only check the password if it's provided
  body("password")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Password must be a string")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  auth,
  async (req, res) => {
    // Update the user's credentials
    checkValidations(req, res);
    if (res.writableEnded) return;

    const { type, email, password } = req.body;
    const { token, uid } = res.locals;

    if (type === "email") {
      try {
        const emailResponse = await FirebaseApi.instance.changeEmail(
          email,
          token
        );
        console.log(`Sending verification email to ${emailResponse.email}...`);
        res.json({
          ...emailResponse,
          token,
        });
      } catch (error) {
        handleFirebaseRestError("Failed to change the email", error, res);
      }
    } else if (
      password !== undefined &&
      token !== undefined &&
      uid !== undefined
    ) {
      // Change the user's password if they're already signed in
      try {
        await FirebaseAdmin.instance.changePassword(uid, password);
        // Keep the response consistent with the other update types
        res.json({
          kind: "",
          email,
          token,
        });
      } catch (err) {
        const error = err as FirebaseAuthError;
        console.error("Error changing the user's password:", error);
        res.status(500).json({ error: error.message });
      }
    } else {
      // Reset the user's password when unauthenticated
      try {
        const emailResponse = await FirebaseApi.instance.resetPassword(email);
        console.log(
          `Sending password reset email to ${emailResponse.email}...`
        );
        res.json({
          ...emailResponse,
          token,
        });
      } catch (error) {
        handleFirebaseRestError("Failed to reset the password", error, res);
      }
    }
  }
);

router.delete("/", auth, async (_req, res) => {
  // Delete the user's account
  const { uid } = res.locals;

  try {
    await FirebaseAdmin.instance.deleteUser(uid);
    res.clearCookie(COOKIES.ID_TOKEN, BASE_COOKIE_OPTIONS);
    res.sendStatus(204);
  } catch (err) {
    const error = err as FirebaseAuthError;
    console.error("Error deleting user:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/verify", auth, async (_req, res) => {
  // Send a verification email
  const { token } = res.locals;

  try {
    const emailResponse = await FirebaseApi.instance.verifyEmail(token);
    console.log(`Sending verification email to ${emailResponse.email}...`);
    res.json({
      ...emailResponse,
      token,
    });
  } catch (error) {
    handleFirebaseRestError("Failed to send a verification email", error, res);
  }
});

router.post(
  "/login",
  body().isObject().withMessage("Body is missing or not an object"),
  body("email").isEmail().withMessage("Invalid/missing email"),
  body("password")
    .isString()
    .withMessage("Password must be a string")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  async (req, res) => {
    checkValidations(req, res);
    if (res.writableEnded) return;

    const { email, password } = req.body;

    try {
      const { localId, idToken, refreshToken } =
        await FirebaseApi.instance.login(email, password);
      await saveRefreshToken(localId, refreshToken);
      const { emailVerified } = await FirebaseAdmin.instance.getUser(localId);

      res.cookie(COOKIES.ID_TOKEN, idToken, COOKIE_2_WEEKS);
      res.json({
        uid: localId,
        token: idToken,
        emailVerified,
      });
    } catch (error) {
      handleFirebaseRestError("Failed to login", error, res);
    }
  }
);

router.post("/logout", auth, async (_req, res) => {
  const { uid } = res.locals;

  try {
    await FirebaseAdmin.instance.logoutUser(uid);
    res.clearCookie(COOKIES.ID_TOKEN, BASE_COOKIE_OPTIONS);
    res.sendStatus(204);
  } catch (err) {
    const error = err as FirebaseAuthError;
    console.error("Error logging out:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get(
  "/oauth",
  query("redirectUrl")
    .isString()
    .withMessage("Redirect URL is not a string")
    .notEmpty()
    .withMessage("Redirect URL is required"),
  async (req, res) => {
    checkValidations(req, res);
    if (res.writableEnded) return;

    const redirectUrl = req.query?.redirectUrl;

    try {
      const authUrls = await FirebaseApi.instance.getOAuthUrls(redirectUrl);
      res.json(authUrls);
    } catch (error) {
      handleFirebaseRestError("Failed to get all the OAuth URLs", error, res);
    }
  }
);

router.post(
  "/oauth",
  body().isObject().withMessage("Body is missing or not an object"),
  body("code").isString().withMessage("Invalid/missing code"),
  body("providerId")
    .isString()
    .withMessage("Invalid/missing providerId")
    .isIn(Object.values(OAuthProvider))
    .withMessage("Invalid provider ID"),
  body("redirectUrl").isString().withMessage("Invalid/missing redirectUrl"),
  auth,
  async (req, res) => {
    checkValidations(req, res);
    if (res.writableEnded) return;

    const { code, providerId, redirectUrl } = req.body;
    const { token } = res.locals;
    let oauthToken: string;
    let errorPrefix = `Failed to login to OAuth provider ${providerId}`;

    try {
      // Call the OAuth provider to exchange the authorization code for an OAuth token
      oauthToken = await FirebaseApi.instance.getOAuthToken(
        providerId,
        code,
        redirectUrl
      );
    } catch (error) {
      if (!isAxiosError(error)) {
        handleFirebaseRestError(errorPrefix, error, res);
        return;
      }

      // Convert the OAuth error to a Firebase error
      const unknownError = "An unknown error occurred";
      const oauthError: FirebaseRestError["error"] = {
        code: error.response?.status ?? 500,
        message: unknownError,
      };
      switch (providerId) {
        case OAuthProvider.GOOGLE:
          oauthError.message =
            error.response?.data?.error_description ?? unknownError;
          break;
        case OAuthProvider.FACEBOOK:
          oauthError.message =
            error.response?.data?.error?.message ?? unknownError;
          break;
        case OAuthProvider.GITHUB:
          // GitHub returns 200 on error
          oauthError.code = 500;
          oauthError.message =
            error.response?.data?.error_description ?? unknownError;
      }

      res.status(oauthError.code).json({
        error: `${errorPrefix}: ${oauthError.message}`,
      });
      return;
    }

    errorPrefix = `Failed to link OAuth provider ${providerId}`;

    try {
      // Call Firebase to exchange the OAuth token for a Firebase token
      const {
        emailVerified,
        localId,
        idToken,
        refreshToken,
        errorMessage,
        needConfirmation,
        verifiedProvider,
      } = await FirebaseApi.instance.linkOAuthProvider(
        providerId,
        oauthToken,
        token
      );

      if (errorMessage !== undefined) {
        // The request succeeded, but the account may have already been linked
        res.status(400).json({
          error: `${errorPrefix}: ${errorMessage}`,
        });
        return;
      } else if (needConfirmation === true && verifiedProvider !== undefined) {
        // The email must be verified using certain providers
        res.status(400).json({
          error: `${errorPrefix}: Email not verified, please sign in using the following providers: ${verifiedProvider.join(
            ", "
          )}`,
        });
        return;
      } else if (
        localId === undefined ||
        idToken === undefined ||
        refreshToken === undefined
      ) {
        // Catch-all for any other errors
        res.status(500).json({
          error: `${errorPrefix}: Missing required chef credentials`,
        });
        return;
      }

      // Create/update the chef alongside their refresh token
      const existingChef = await getChef(localId);
      if (existingChef === null) {
        await createChef(localId);
      }
      await saveRefreshToken(localId, refreshToken);

      res.cookie(COOKIES.ID_TOKEN, idToken, COOKIE_2_WEEKS);
      res.json({
        uid: localId,
        token: idToken,
        emailVerified,
      });
    } catch (error) {
      handleFirebaseRestError(errorPrefix, error, res);
    }
  }
);

router.delete(
  "/oauth",
  query("providerId")
    .isString()
    .withMessage("Provider ID is not a string")
    .notEmpty()
    .withMessage("Provider ID is required")
    .isIn(Object.values(OAuthProvider))
    .withMessage("Invalid provider ID"),
  auth,
  async (req, res) => {
    checkValidations(req, res);
    if (res.writableEnded) return;

    const providerId = req.query?.providerId as OAuthProvider;
    const { token } = res.locals;

    try {
      await FirebaseApi.instance.unlinkOAuthProvider(providerId, token);
      res.sendStatus(204);
    } catch (error) {
      handleFirebaseRestError(
        `Failed to unlink OAuth provider ${providerId}`,
        error,
        res
      );
    }
  }
);

export default router;
