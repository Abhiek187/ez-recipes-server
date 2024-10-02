import { isAxiosError } from "axios";
import express from "express";
import { body, validationResult } from "express-validator";
import { AuthError } from "firebase/auth";
import { FirebaseAuthError } from "firebase-admin/auth";

import FirebaseAdmin from "../utils/auth/admin";
import FirebaseClient from "../utils/auth/client";
import auth from "../middleware/auth";
import { verifyEmail } from "../utils/auth/api";
import { isFirebaseRestError } from "../types/firebase/FirebaseRestError";
import { handleAxiosError } from "../utils/api";

const router = express.Router();

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
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      const errorMessages = validationErrors.array().map((error) => error.msg);
      res
        .status(400)
        .json({ error: `Invalid request: ${errorMessages.join(" | ")}` });
      return;
    }

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

router.post("/verify", auth, async (_req, res) => {
  // Send a verification email
  const { token } = res.locals;

  try {
    const emailResponse = await verifyEmail(token);
    console.log(`Sending verification email to ${emailResponse.email}...`);
    res.json(emailResponse);
  } catch (error) {
    if (isAxiosError(error) && isFirebaseRestError(error.response?.data)) {
      const { code, message } = error.response.data.error;
      res
        .status(code)
        .json({ error: `Failed to send a verification email: ${message}` });
    } else if (isAxiosError(error)) {
      const [status, json] = handleAxiosError(error);
      res.status(status).json(json);
    } else {
      res.status(500).json({
        error: `Failed to send a verification email: ${JSON.stringify(
          error,
          Object.getOwnPropertyNames(error)
        )}`,
      });
    }
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
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      const errorMessages = validationErrors.array().map((error) => error.msg);
      res
        .status(400)
        .json({ error: `Invalid request: ${errorMessages.join(" | ")}` });
      return;
    }

    const { email, password } = req.body;

    try {
      const loginResult = await FirebaseClient.instance.loginUser(
        email,
        password
      );
      res.json(loginResult);
    } catch (err) {
      const error = err as AuthError;
      console.error("Error logging in:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.post("/logout", async (_req, res) => {
  try {
    await FirebaseClient.instance.logoutUser();
    res.sendStatus(204);
  } catch (err) {
    const error = err as AuthError;
    console.error("Error logging out:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  // Delete the user's account
  const uid = req.params.id;

  try {
    await FirebaseAdmin.instance.deleteUser(uid);
    res.sendStatus(204);
  } catch (err) {
    const error = err as FirebaseAuthError;
    console.error("Error deleting user:", error);
    res.status(404).json({ error: error.message });
  }
});

export default router;
