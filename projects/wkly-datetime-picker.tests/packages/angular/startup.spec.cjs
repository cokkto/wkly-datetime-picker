const { test, expect } = require("@playwright/test");

// One package journey owns one context/page per version. The reload at the end
// deliberately tests cold bootstrap, rather than resetting between actions.
test("packed AOT startup, forms, optional entry and cold reload", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("./");
  await expect(page.getByRole("heading")).toContainText("Confirm / week");
  await expect(page.locator("button.day.selected")).toHaveText("15");
  await expect(page.locator("#valid")).toHaveText("true");
  const day = page.locator(
    `button.day[data-day="${Date.UTC(2020, 1, 16) / 86400000}"]`,
  );
  await day.click();
  await expect(page.locator("#value")).toHaveText("2020-02-16T00:00:00.000Z");
  await page.locator("#reset").click();
  await expect(page.locator("button.day.selected")).toHaveText("20");
  await page.locator("#disable").click();
  await expect(day).toBeDisabled();
  await page.locator("#dialog").click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await page.locator("#overlay").click();
  await expect(page.locator('.cdk-overlay-pane[role="dialog"]')).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator(".cdk-overlay-pane")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("#value")).toHaveText("2020-02-15T00:00:00.000Z");
  await expect(page.locator("button.day.selected")).toHaveText("15");
  expect(errors).toEqual([]);
});
