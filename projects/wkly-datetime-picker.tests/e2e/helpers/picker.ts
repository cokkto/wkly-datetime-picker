import { expect } from "../fixtures";
import type { Page } from "@playwright/test";
export async function openPicker(page: Page, id = "virtual-weeks") {
  await page.goto(`/cases/empty/${id}`);
  const panel = page.getByTestId(id);
  const picker = page.locator("wkly-datetime-picker");
  await expect(picker).toBeVisible();
  const scroller = picker.locator(".week-scroll");
  if (id !== "time" && id !== "time-range")
    await expect(scroller.locator(".week-row").first()).toBeAttached();
  return { panel, picker, scroller };
}
export async function visibleDays(
  scroller: import("@playwright/test").Locator,
) {
  return scroller.evaluate((element: HTMLElement) => {
    const box = element.getBoundingClientRect();
    return Array.from(element.querySelectorAll<HTMLElement>("button.day"))
      .filter((day) => {
        const r = day.getBoundingClientRect();
        return r.top >= box.top && r.bottom <= box.bottom && r.width > 0;
      })
      .map((day) => Number(day.dataset.day));
  });
}
