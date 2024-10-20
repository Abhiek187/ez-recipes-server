// Helper methods for strings

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
