import { CookieOptions } from "express";

export const COOKIES = {
  ID_TOKEN: "idToken",
} as const;

export const BASE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true, // inaccessible via document.cookie, prevents XSS
  secure: true, // only sent in HTTPS requests
  sameSite: "strict", // only sent on sites with the same domain, prevents CSRF
  // Only works if the domain isn't part of the Public Suffix List (PSL)
  // domain: "onrender.com", // https://publicsuffix.org/list/public_suffix_list.dat
};

export const COOKIE_2_WEEKS: CookieOptions = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
};
