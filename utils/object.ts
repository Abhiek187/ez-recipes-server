// Helper methods for objects

/**
 * Check if the input is an object
 *
 * Source: https://stackoverflow.com/a/8511350
 * @param {any} data the input to check
 * @returns {boolean} true if `data` is an object, false otherwise
 */
export const isObject = (data: any): boolean =>
  typeof data === "object" && !Array.isArray(data) && data !== null;
