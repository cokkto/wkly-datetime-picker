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

test("picker visual layout at desktop and mobile widths", async ({
  page,
}, testInfo) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const picker = page.locator("wkly-datetime-picker .wkly");
    const grid = picker.getByRole("grid");
    const selected = picker.locator("button.day.selected");
    await expect(grid).toBeVisible();
    await expect(selected).toBeVisible();
    const layout = await page.evaluate(() => {
      const selectors = [
        "wkly-datetime-picker .wkly",
        ".toolbar",
        '[role="grid"]',
        "button.day.selected",
      ];
      return selectors.map((selector) => {
        const element = document.querySelector(selector);
        const box = element.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
        };
      });
    });
    const [outer, header, calendar, day] = layout;
    expect(outer.width).toBeGreaterThan(250);
    expect(outer.right).toBeLessThanOrEqual(width + 1);
    expect(header.bottom).toBeLessThanOrEqual(calendar.top + 1);
    expect(day.left).toBeGreaterThanOrEqual(calendar.left - 1);
    expect(day.right).toBeLessThanOrEqual(calendar.right + 1);
    expect(day.height).toBeGreaterThan(20);
    await testInfo.attach(`angular-${process.env.ANGULAR_MAJOR}-${width}.png`, {
      body: await picker.screenshot(),
      contentType: "image/png",
    });
  }
});
