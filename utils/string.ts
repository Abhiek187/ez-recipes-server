// Helper methods for strings
import crypto from "node:crypto";

/**
 * Check if the input is a number or a string that can be parsed as a number
 *
 * Source: https://stackoverflow.com/a/58550111
 * @param num the number or string to check
 * @returns true if `num` can be parsed as a number, false otherwise
 */
export const isNumeric = (num: number | string): boolean =>
  (typeof num === "number" || (typeof num === "string" && num.trim() !== "")) &&
  !isNaN(num as number);

/**
 * Check if the input can be parsed as an integer
 * @param num the number or string to check
 * @returns true if `num` can be parsed as an integer, false otherwise
 */
export const isInteger = (num: number | string): boolean =>
  isNumeric(num) && Number.isInteger(Number(num));

/**
 * Check if the provided timestamp is at least `days` from today's date
 * @param timestamp the UTC timestamp to check
 * @param days the number of days to check from today's date
 * @returns true if `timestamp` is at least `days` old, false otherwise
 */
export const isAtLeastDaysOld = (timestamp: string, days: number): boolean => {
  // If the timestamp is invalid, NaN will always return false
  const oldUTC = new Date(timestamp).getTime();
  const currentUTC = Date.now();
  const daysInMs = days * 24 * 60 * 60 * 1000;
  return currentUTC - oldUTC >= daysInMs;
};

/**
 * Convert an ArrayBuffer to a base64 URL-encoded string
 * @param str the array buffer
 * @returns a base64 URL-encoded string
 */
export const base64URLEncode = (buffer: ArrayBuffer): string =>
  Buffer.from(buffer).toString("base64url");

/**
 * Create a cryptographically secure random string of a specified length
 * @param length the length of the string (default: 64)
 * @returns a randomly generated string
 */
export const generateRandomString = (length: number = 64): string =>
  crypto.randomBytes(length).toString("base64url").slice(0, length);

/**
 * Hash a given string using SHA-256
 * @param message the string to hash
 * @returns the SHA-256 hash as an ArrayBuffer
 */
export const sha256 = async (message: string): Promise<ArrayBuffer> => {
  // Encode the message as an array of unsigned ints (buffer)
  const msgBuffer = Buffer.from(message);
  // Hash the buffer using SHA-256
  return await crypto.subtle.digest("SHA-256", msgBuffer);
};
