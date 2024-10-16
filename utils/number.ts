// Helper methods for numbers

/**
 * Round a number to the specified number of decimal places
 * @param num the number to round
 * @param places the number of decimals places to round to
 * @returns the rounded number
 */
export const round = (num: number, places: number): number => {
  const shift = 10 ** places;
  return Math.round(num * shift) / shift;
};
