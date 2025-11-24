/** @type {import('ts-jest/dist/types').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["dotenv/config"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  randomize: true,
};
