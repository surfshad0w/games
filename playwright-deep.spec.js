const { test, expect, devices } = require("@playwright/test");

test.use({ ...devices["iPad Pro 11"], locale: "en-US" });

test("core games have playable interactions", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const canvasPoint = async (x, y) => {
    const box = await page.locator("#gameCanvas").boundingBox();
    return { x: box.x + (box.width * x) / 960, y: box.y + (box.height * y) / 640 };
  };

  const clickCanvas = async (x, y) => {
    const p = await canvasPoint(x, y);
    await page.mouse.click(p.x, p.y);
  };

  const openGame = async (name) => {
    await page.locator(".game-card").filter({ hasText: name }).click();
    await expect(page.locator("#gameTitle")).toHaveText(name);
  };

  const back = async () => {
    await page.locator("#backBtn").click();
    await expect(page.locator("#hub")).toBeVisible();
  };

  await openGame("Gem Pop Arcade");
  for (const [x, y] of [[250, 160], [320, 225], [390, 290], [460, 355], [530, 420]]) {
    await clickCanvas(x, y);
  }
  await expect(page.locator("#statScore")).not.toHaveText("0");
  await expect(page.locator("#hint")).not.toContainText(/undefined|NaN/);
  await back();

  await openGame("Kitchen Chaos");
  await clickCanvas(150, 450);
  await clickCanvas(795, 110);
  await expect(page.locator("#hint")).toContainText(/cleared/i);
  await back();

  await openGame("Space Miner");
  await clickCanvas(820, 320);
  await page.waitForTimeout(1800);
  await expect(page.locator("#hint")).not.toContainText(/undefined|NaN/);
  await back();

  await openGame("Dungeon Dash");
  for (const [x, y, wait] of [[850, 540, 3200], [850, 135, 3000], [825, 135, 1000], [830, 535, 3300]]) {
    await clickCanvas(x, y);
    await page.waitForTimeout(wait);
  }
  await expect.poll(async () => Number(await page.locator("#statScore").textContent())).toBeGreaterThanOrEqual(20);
  await expect(page.locator("#hint")).not.toContainText(/undefined|NaN/);
});

test("pet rescue jump returns to normal and spawns reachable treats", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator(".game-card").filter({ hasText: "Pet Rescue Run" }).click();
  await expect(page.locator("#gameTitle")).toHaveText("Pet Rescue Run");

  const box = await page.locator("#gameCanvas").boundingBox();
  const dog = { x: box.x + box.width * (135 / 960), y: box.y + box.height * (472 / 640) };

  await page.mouse.move(dog.x, dog.y);
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(850);

  await expect.poll(async () => {
    const state = await page.evaluate(() => window.__araActiveGame.debugState());
    return state.player.grounded && Math.abs(state.player.y - 472) <= 2;
  }).toBe(true);

  await page.waitForTimeout(2200);
  const state = await page.evaluate(() => window.__araActiveGame.debugState());
  expect(state.treats.length).toBeGreaterThan(0);
  expect(state.treats.every((t) => [430, 402, 392, 386, 358, 354, 342, 336].includes(t.y))).toBe(true);
  await expect(page.locator("#statTimeLabel")).toHaveText("hearts");
});
