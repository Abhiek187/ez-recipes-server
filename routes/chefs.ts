import express from "express";
import { body, validationResult } from "express-validator";
import { AuthError } from "firebase/auth";
import { FirebaseAuthError } from "firebase-admin/auth";

import FirebaseAdmin from "../utils/auth/admin";
import FirebaseClient from "../utils/auth/client";

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
      return res
        .status(400)
        .json({ error: `Invalid request: ${errorMessages.join(" | ")}` });
    }

    const { email, password } = req.body;

    try {
      const uid = await FirebaseAdmin.instance.createUser(email, password);
      res.status(201).json({ uid });
    } catch (err) {
      const error = err as FirebaseAuthError;
      console.error("Error creating new user:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

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
      return res
        .status(400)
        .json({ error: `Invalid request: ${errorMessages.join(" | ")}` });
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
