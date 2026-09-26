const { test, expect } = require("@playwright/test");

test("packed public imports, adapter rendering and reactive forms", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading")).toContainText("Confirm / week");
  await expect(page.getByRole("grid")).toBeVisible();
  await expect(page.locator("button.day.selected")).toHaveText("15");
  await expect(page.locator("#valid")).toHaveText("true");
  const epochDay = Date.UTC(2020, 1, 16) / 86400000;
  const day = page.locator(`button.day[data-day="${epochDay}"]`);
  await day.click();
  const confirm = page.getByRole("button", { name: "Confirm", exact: true });
  if (await confirm.isVisible()) await confirm.click();
  await expect(page.locator("#value")).toHaveText("2020-02-16T00:00:00.000Z");
  await page.locator("#reset").click();
  await expect(page.locator("button.day.selected")).toHaveText("20");
  await page.locator("#disable").click();
  await expect(
    page.locator('[role="gridcell"][aria-selected="true"]'),
  ).toHaveAttribute("aria-disabled", "true");
  await expect(day).toBeDisabled();
  await expect(page.locator("#value")).toHaveText("2020-02-20T00:00:00.000Z");
  expect(errors).toEqual([]);
});
