// Helper methods for objects

/**
 * Check if the input is an object
 *
 * Source: https://stackoverflow.com/a/8511350
 * @param data the input to check
 * @returns true if `data` is an object, false otherwise
 */
export const isObject = (data: any): boolean =>
  typeof data === "object" && !Array.isArray(data) && data !== null;
