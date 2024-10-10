// Helper methods for objects

/**
 * Check if the input is an object
 *
 * Source: https://stackoverflow.com/a/8511350
 * @param data the input to check
 * @returns true if `data` is an object, false otherwise
 */
export const isObject = (data: unknown): boolean =>
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

/**
 * Filter an object by certain keys
 * @param object the object to filter
 * @param keys an array of keys to keep in the object,
 * if the key doesn't exist in `object`, it's ignored
 * @returns a new object only containing the keys passed
 */
export const filterObject = <T extends string>(
  object: { [key in T]?: unknown },
  keys: T[]
): typeof object => {
  return Object.fromEntries(
    Object.entries(object).filter(([key]) => keys.includes(key as T))
  ) as typeof object;
};
