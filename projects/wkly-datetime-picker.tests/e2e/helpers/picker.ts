import { expect } from "../fixtures";
import type { Page } from "@playwright/test";
export async function openPicker(
  page: Page,
  id = "virtual-weeks",
  locale?: string,
) {
  await page.goto(`/cases/empty/${id}`);
  const panel = page.getByTestId(id);
  const picker = page.locator("wkly-datetime-picker");
  await expect(picker).toBeVisible();
  if (locale) {
    await panel.getByText("Configure this example", { exact: true }).click();
    await panel
      .getByRole("combobox", { name: "Locale", exact: true })
      .selectOption(locale);
    await expect(panel.getByTestId("context")).toContainText(`${locale} ·`);
    await panel.getByText("Configure this example", { exact: true }).click();
  }
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
        // Firefox can apply a fractional scrollTop even for an integer request.
        // Compare relative edges at whole CSS-pixel precision so scroll rounding
        // does not exclude a whole week. Larger clipping still excludes the day.
        // Rounding differences keeps the result independent of the page origin.
        return (
          Math.round(r.top - box.top) >= 0 &&
          Math.round(r.bottom - box.bottom) <= 0 &&
          r.width > 0
        );
      })
      .map((day) => Number(day.dataset.day));
  });
}
