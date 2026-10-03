import { expect } from "../fixtures";
import type { Page } from "@playwright/test";
export async function openPicker(
  page: Page,
  route = "/virtualization",
  id = "virtual-weeks",
) {
  await page.goto(route);
  await page
    .getByRole("combobox", { name: "Angular runtime version" })
    .selectOption("22");
  const panel = page.getByTestId(id);
  const frame = panel.frameLocator("iframe");
  const picker = frame.locator("wkly-datetime-picker");
  await expect(picker).toBeVisible();
  const scroller = picker.locator(".week-scroll");
  if (id !== "time" && id !== "time-range")
    await expect(scroller.locator(".week-row").first()).toBeAttached();
  return { panel, frame, picker, scroller };
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
