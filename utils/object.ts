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

/**
 * Check if an object is empty (excluding inherited properties)
 *
 * Source: https://stackoverflow.com/a/32108184
 * @param object the object to check
 * @returns true if `object` is empty, false otherwise
 */
export const isEmptyObject = (object: Record<string, unknown>) => {
  for (const prop in object) {
    if (Object.hasOwn(object, prop)) {
      return false;
    }
  }

  return true;
};
