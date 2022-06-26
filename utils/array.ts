// Helper methods for arrays

// Get a random element from an array
export const getRandomElement = <T>(array: Array<T>): T =>
  array[Math.floor(Math.random() * array.length)];
