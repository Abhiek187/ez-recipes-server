// Helper methods for arrays

/**
 * Get a random element from the provided array
 * @param array - the array
 * @returns a random element from `array`
 * @throws if `array` is empty
 */
export const getRandomElement = <T>(array: Array<T>): T => {
  if (array.length === 0) {
    throw new Error(
      "The array must contain at least one element to be randomly selected."
    );
  }

  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Combine two arrays together in pairs. If one array is longer than the other, the pairs are padded with undefined.
 * Source: https://stackoverflow.com/a/22015930
 * @param a the first array
 * @param b the second array
 * @returns a 2D array containing each pair
 */
export const zip = <A, B>(a: A[], b: B[]): [A | undefined, B | undefined][] =>
  Array(Math.max(b.length, a.length))
    .fill(undefined)
    .map((_, i) => [a[i], b[i]]);
