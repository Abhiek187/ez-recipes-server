import { isAxiosError } from "axios";
import express from "express";
import { body, validationResult } from "express-validator";
import { Request } from "express-validator/lib/base";
import { FirebaseAuthError } from "firebase-admin/auth";

import FirebaseAdmin from "../utils/auth/admin";
import auth from "../middleware/auth";
import FirebaseApi from "../utils/auth/api";
import { isFirebaseRestError } from "../types/firebase/FirebaseRestError";
import { handleAxiosError } from "../utils/api";
import { getChef, saveRefreshToken } from "../utils/db";
import { filterObject } from "../utils/object";

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
  auth,
  async (req, res) => {
    // Update the user's credentials
    checkValidations(req, res);
    if (res.writableEnded) return;

    const { type, email } = req.body;
    const { token } = res.locals;

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
    } else {
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
      const { localId, idToken, registered, refreshToken } =
        await FirebaseApi.instance.login(email, password);
      await saveRefreshToken(localId, refreshToken);

      res.json({
        uid: localId,
        token: idToken,
        emailVerified: registered,
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
    res.sendStatus(204);
  } catch (err) {
    const error = err as FirebaseAuthError;
    console.error("Error logging out:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
