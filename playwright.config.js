const { defineConfig } = require("@playwright/test");

const port = process.env.PORT || 4173;
const baseURL = process.env.BASE_URL || `http://127.0.0.1:${port}`;

module.exports = defineConfig({
  testMatch: ["playwright-*.spec.js"],
  use: {
    baseURL
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `python3 -m http.server ${port} --directory .`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 10_000
      }
});
