import { test, expect } from "../fixtures";
import { openPicker, visibleDays } from "../helpers/picker";
import { SCREEN_TYPES_MAIN } from "../helpers/constants";

for (const calendar of ["hebrew", "hijri"])
  for (const width of SCREEN_TYPES_MAIN)
    test(`${calendar} selected calendar RTL layout ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const { picker, scroller } = await openPicker(page, calendar + "-pair");
      await expect(picker.locator("[dir='rtl']").first()).toBeVisible();
      const selected = picker.locator(".day.selected");
      await expect(selected).toHaveAttribute("data-day", "19807");
      await expect(selected).toHaveAttribute(
        "aria-label",
        calendar === "hebrew" ? /אדר.*5784/ : /رمضان.*١٤٤٥/,
      );
      const days = await visibleDays(scroller);
      const first = await picker
        .locator(`button.day[data-day='${days[0]}']`)
        .boundingBox();
      const second = await picker
        .locator(`button.day[data-day='${days[1]}']`)
        .boundingBox();
      expect(first!.x).toBeGreaterThan(second!.x);
      expect(Math.abs(first!.y - second!.y)).toBeLessThan(1);
      await expect(
        picker
          .locator(".annotation")
          .filter({ hasText: calendar === "hebrew" ? "אדר" : "رمضان" })
          .first(),
      ).toBeVisible();
      await expect(picker).toHaveScreenshot(
        `${calendar}-selected-rtl-${width}.png`,
        { animations: "disabled" },
      );
    });
