const { defineConfig, devices } = require("@playwright/test");

const port = process.env.PORT || 4173;
const baseURL = process.env.BASE_URL || `http://127.0.0.1:${port}`;

module.exports = defineConfig({
  testMatch: ["playwright-*.spec.js"],
  // The static server and service-worker cache are shared across projects;
  // serial workers keep browser runs deterministic on CI and local machines.
  workers: 1,
  use: {
    baseURL
  },
  projects: [
    { name: "chromium", use: { ...devices["iPad Pro 11"], browserName: "chromium" } },
    { name: "webkit", use: { ...devices["iPad Pro 11"], browserName: "webkit" } }
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `python3 -m http.server ${port} --directory .`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 10_000
      }
});
