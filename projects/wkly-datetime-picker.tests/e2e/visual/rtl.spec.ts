import { test, expect } from "../fixtures";
import { openPicker, visibleDays } from "../helpers/picker";
import { SCREEN_TYPES_MAIN } from "../helpers/constants";

for (const width of SCREEN_TYPES_MAIN)
  test(`Arabic RTL datetime layout ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const { picker, scroller } = await openPicker(page, "arabic");
    await expect(picker.locator("[dir='rtl']").first()).toBeVisible();
    const days = await visibleDays(scroller);
    const first = picker.locator(`button.day[data-day='${days[0]}']`);
    const second = picker.locator(`button.day[data-day='${days[1]}']`);
    const a = await first.boundingBox(),
      b = await second.boundingBox();
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.x).toBeGreaterThan(b!.x);
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(1);
    await expect(
      picker.getByRole("button", { name: "الأسبوع التالي", exact: true }),
    ).toBeVisible();
    await expect(picker).toHaveScreenshot(`arabic-rtl-datetime-${width}.png`, {
      animations: "disabled",
    });
  });
