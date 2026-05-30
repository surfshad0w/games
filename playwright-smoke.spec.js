const { test, expect, devices } = require("@playwright/test");

test.use({ ...devices["iPad Pro 11"], locale: "en-US" });

test("hub and every game opens on iPad viewport", async ({ page }) => {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/", { waitUntil: "networkidle" });
  await page.screenshot({ path: "hub-ipad.png", fullPage: true });

  await expect(page.locator(".game-card")).toHaveCount(5);
  const names = await page.locator(".game-card h3").allTextContents();
  expect(names).toEqual([
    "Gem Pop Arcade",
    "Pet Rescue Run",
    "Space Miner",
    "Mini Golf Madness",
    "Rainbow Art Studio"
  ]);

  for (let index = 0; index < names.length; index += 1) {
    await page.locator(".game-card").nth(index).click();
    await expect(page.locator("#gameTitle")).toHaveText(names[index]);
    await expect(page.locator("#gameCanvas")).toBeVisible();
    const box = await page.locator("#gameCanvas").boundingBox();
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    if (names[index] === "Gem Pop Arcade") {
      await expect(page.locator("#statScore")).not.toHaveText("0");
    }
    await expect(page.locator("#statScore")).toContainText(/^[0-9]+$/);
    await page.locator("#backBtn").click();
    await expect(page.locator("#hub")).toBeVisible();
  }

  expect(errors).toEqual([]);
});

test("hub loads when saved data is corrupt", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("ara-games-v1", "not-json");
  });

  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page.locator(".game-card")).toHaveCount(5);
  await expect(page.locator("#totalStars")).toHaveText("0");
});
