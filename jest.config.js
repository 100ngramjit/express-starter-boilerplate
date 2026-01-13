/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  verbose: true,
  testTimeout: 30000,
};

module.exports = config;
