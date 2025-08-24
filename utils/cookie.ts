import { CookieOptions } from "express";

export const COOKIES = {
  ID_TOKEN: "idToken",
} as const;

export const BASE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true, // inaccessible via document.cookie, prevents XSS
  secure: true, // only sent in HTTPS requests
  sameSite: "strict", // only sent on sites with the same domain, prevents CSRF
};

export const COOKIE_30_DAYS: CookieOptions = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};
