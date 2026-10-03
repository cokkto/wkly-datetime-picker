import { test, expect } from "../fixtures";
import { openPicker, visibleDays } from "../helpers/picker";
import { SCREEN_TYPES_MAIN, SCREEN_SIZE } from "../helpers/constants";
test("keyboard crosses week boundaries and pages without committing focus", async ({
  page,
}) => {
  const { picker, scroller, panel } = await openPicker(page);
  const before = await panel.getByTestId("value").textContent();
  const days = await visibleDays(scroller);
  let current = days[6];
  await picker.locator(`button.day[data-day='${current}']`).focus();
  for (const [key, delta] of [
    ["ArrowRight", 1],
    ["ArrowDown", 7],
    ["PageDown", 7],
    ["Shift+PageUp", -28],
    ["ArrowLeft", -1],
  ] as const) {
    await page.keyboard.press(key);
    current += delta;
    await expect(
      picker.locator(`button.day[data-day='${current}']`),
    ).toBeFocused();
    await expect(panel.getByTestId("value")).toHaveText(before!);
  }
  await page.keyboard.press("Enter");
  await expect(panel.getByTestId("value")).toContainText(
    new Date(current * 86400000).toISOString(),
  );
});
test("resize after navigation preserves selection and usable keyboard focus", async ({
  page,
}) => {
  const { picker, panel } = await openPicker(page);
  const before = await panel.getByTestId("value").textContent();
  for (const width of [...SCREEN_TYPES_MAIN, SCREEN_SIZE.MOBILE_LARGE]) {
    await page.setViewportSize({ width, height: 844 });
    await picker
      .getByRole("button", { name: "Next week", exact: true })
      .click();
    await picker
      .getByRole("button", { name: "Previous week", exact: true })
      .click();
    await expect(panel.getByTestId("value")).toHaveText(before!);
    const selected = picker.locator("button.day.selected");
    await selected.focus();
    await expect(selected).toBeFocused();
  }
});
test("repeated week navigation reverses across year boundary", async ({
  page,
}) => {
  const { picker, scroller } = await openPicker(page);
  const before = await visibleDays(scroller);
  for (let i = 1; i <= 4; i++) {
    await picker
      .getByRole("button", { name: "Next week", exact: true })
      .click();
    await expect
      .poll(async () => (await visibleDays(scroller))[0])
      .toBe(before[0] + 7 * i);
  }
  for (let i = 0; i < 4; i++)
    await picker
      .getByRole("button", { name: "Previous week", exact: true })
      .click();
  await expect.poll(() => visibleDays(scroller)).toEqual(before);
});
test("wheel scroll and reverse preserve selection", async ({ page }) => {
  const { scroller, picker } = await openPicker(page);
  const before = await visibleDays(scroller);
  const selected = await picker
    .locator(".day.selected")
    .getAttribute("data-day");
  await scroller.hover();
  await page.mouse.wheel(0, 180);
  await expect.poll(() => visibleDays(scroller)).not.toEqual(before);
  await page.mouse.wheel(0, -180);
  await expect.poll(() => visibleDays(scroller)).toEqual(before);
  await expect(picker.locator(`.day[data-day='${selected}']`)).toHaveClass(
    /selected/,
  );
});
test("click, hover, keyboard focus and selection", async ({ page }) => {
  const { picker, scroller } = await openPicker(page);
  const days = await visibleDays(scroller);
  const day = picker.locator(`button.day[data-day='${days[8]}']`);
  await day.hover();
  await day.click();
  await expect(day).toHaveClass(/selected/);
  await day.focus();
  await expect(day).toBeFocused();
  await page.keyboard.press("ArrowRight");
  const next = picker.locator(`button.day[data-day='${days[8] + 1}']`);
  await expect(next).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(next).toHaveClass(/selected/);
});
test("touch tap selects a visible day", async ({ page }, info) => {
  test.skip(!info.project.use.hasTouch, "Touch-enabled project only");
  const { picker, scroller } = await openPicker(page);
  const days = await visibleDays(scroller);
  const day = picker.locator(`button.day[data-day='${days[8]}']`);
  await day.tap();
  await expect(day).toHaveClass(/selected/);
});
