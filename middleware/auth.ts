import { NextFunction, Request, Response } from "express";

import FirebaseAdmin from "../utils/auth/admin";

export default async (req: Request, res: Response, next: NextFunction) => {
  // Validate the ID token from Firebase
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split("Bearer ")[1]
    : authHeader;

  if (token === undefined) {
    return res
      .status(401)
      .json({ error: "Missing the Firebase ID token from the request" });
  }

  try {
    const uid = await FirebaseAdmin.instance.validateToken(token);
    // Save the UID & token for requests that need it
    res.locals.uid = uid;
    res.locals.token = token;
    next();
  } catch (error) {
    res
      .status(401)
      .json({ error: `Invalid Firebase token provided: ${error}` });
  }
};
