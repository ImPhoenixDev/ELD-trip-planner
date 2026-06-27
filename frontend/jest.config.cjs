module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],
  moduleNameMapper: {
    // Per-component CSS / CSS-module imports become inert in tests.
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    // Static assets resolve to a stub string.
    "\\.(png|jpe?g|gif|svg|webp|avif)$": "<rootDir>/test/fileMock.cjs",
  },
  testMatch: ["<rootDir>/src/**/*.test.{js,jsx,ts,tsx}"],
};
