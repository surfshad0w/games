const { test, expect } = require("@playwright/test");

test("play stage preserves its aspect ratio in iPad landscape", async ({ page }) => {
  await page.setViewportSize({ width: 1194, height: 834 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator(".game-card").first().click();

  const metrics = await page.evaluate(() => {
    const stage = document.querySelector(".stage-wrap").getBoundingClientRect();
    return {
      ratio: stage.width / stage.height,
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight
    };
  });

  expect(metrics.ratio).toBeCloseTo(1.5, 2);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.viewportHeight);
});

test("hub does not request game sprite atlases until a game opens", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const before = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name).filter((name) => name.includes("sprites")));
  expect(before).toEqual([]);

  await page.locator(".game-card").filter({ hasText: "Gem Pop Arcade" }).click();
  await expect.poll(async () => page.evaluate(() => performance.getEntriesByType("resource").some((entry) => entry.name.includes("gem-pop-sprites")))).toBe(true);
});

test("pause freezes the game clock and resumes cleanly", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator(".game-card").filter({ hasText: "Space Miner" }).click();

  await page.locator("#pauseBtn").click();
  const paused = await page.locator("#statTime").textContent();
  await page.waitForTimeout(250);
  await expect(page.locator("#statTime")).toHaveText(paused);
  await page.locator("#pauseBtn").click();
  await expect(page.locator("#pauseBtn")).toHaveText("Pause");
});

test("cached shell can reopen offline", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "Playwright WebKit cannot reliably reload an offline service-worker page");
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => navigator.serviceWorker?.ready);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".game-card")).toHaveCount(6);
});

test("play shell exposes a focused status channel instead of a live canvas region", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator(".game-card").first().click();
  await expect(page.locator("#play")).not.toHaveAttribute("aria-live");
  await expect(page.locator("#status")).toHaveAttribute("role", "status");
  await expect(page.locator("#gameCanvas")).toHaveAttribute("tabindex", "0");
});
