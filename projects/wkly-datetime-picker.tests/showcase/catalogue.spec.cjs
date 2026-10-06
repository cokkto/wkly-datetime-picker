const { test, expect } = require("@playwright/test");
const metadata = require("../../wkly-datetime-picker.showcase/src/page-metadata.json");
test("compiled public routes render WKLY controls and initial state", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  for (const [route, info] of Object.entries(metadata)) {
    await test.step(route || "overview", async () => {
      const response = await page.goto(route ? `./${route}/` : "./");
      expect(response.status()).toBe(200);
      await expect(page).toHaveTitle(info.title);
      const panels = page.locator("demo-panel");
      await expect(panels.first()).toBeVisible();
      const count = await panels.count();
      await expect(page.locator("wkly-runtime")).toHaveCount(count);
      await expect(page.locator("wkly-datetime-picker").first()).toBeVisible();
      for (let index = 0; index < count; index++)
        await expect(panels.nth(index).getByTestId("value")).not.toBeEmpty();
    });
  }
  expect(errors).toEqual([]);
});
