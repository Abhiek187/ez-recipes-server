import express from "express";
import { body, validationResult } from "express-validator";

import { createUser, deleteUser } from "../utils/auth";

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
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      const errorMessages = validationErrors.array().map((error) => error.msg);
      return res
        .status(400)
        .json({ error: `Invalid request: ${errorMessages.join(" | ")}` });
    }

    const { email, password } = req.body;
    const error = await createUser(email, password);

    if (error !== undefined) {
      res.status(400).json({ error });
    } else {
      res.sendStatus(201);
    }
  }
);

router.delete("/:id", async (req, res) => {
  // Delete the user's account
  const uid = req.params.id;
  const error = await deleteUser(uid);

  if (error !== undefined) {
    res.status(404).json({ error });
  } else {
    res.sendStatus(204);
  }
});

export default router;
