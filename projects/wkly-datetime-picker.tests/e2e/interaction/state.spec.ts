import { test, expect } from "../fixtures";
import { openPicker, visibleDays } from "../helpers/picker";
test("range selection orders reversed endpoints and exposes ARIA selection", async ({
  page,
}) => {
  const { picker, panel, scroller } = await openPicker(page, "date-range");
  await panel.getByRole("button", { name: "Clear value", exact: true }).click();
  const days = await visibleDays(scroller);
  const later = picker.locator(`button.day[data-day='${days[10]}']`),
    earlier = picker.locator(`button.day[data-day='${days[8]}']`);
  await later.click();
  await earlier.click();
  const iso = (day: number) => new Date(day * 86400000).toISOString();
  await expect(panel.getByTestId("value")).toContainText(iso(days[8]));
  await expect(panel.getByTestId("value")).toContainText(iso(days[10]));
  const value = JSON.parse((await panel.getByTestId("value").textContent())!);
  expect(value).toEqual([iso(days[8]), iso(days[10])]);
  await expect(earlier.locator("..")).toHaveAttribute("aria-selected", "true");
  await expect(later.locator("..")).toHaveAttribute("aria-selected", "true");
});
test("grid structure, accessible day names and disabled selection", async ({
  page,
}) => {
  const { picker, panel, scroller } = await openPicker(page, "constraints");
  await expect(picker.getByRole("grid")).toBeVisible();
  const row = picker.locator(".week-row").nth(4);
  await expect(row.getByRole("gridcell")).toHaveCount(7);
  const cells = row.getByRole("gridcell");
  const base = (await row.getByRole("rowheader").count()) ? 2 : 1;
  for (let i = 0; i < 7; i++)
    await expect(cells.nth(i)).toHaveAttribute(
      "aria-colindex",
      String(base + i),
    );
  const days = await visibleDays(scroller);
  // Use a complete visible row; overscan buttons may have boxes outside the scroll clip.
  const disabledDay = await scroller.evaluate((element: HTMLElement) => {
    const view = element.getBoundingClientRect();
    const day = Array.from(
      element.querySelectorAll<HTMLElement>("button.day[aria-disabled='true']"),
    ).find((button) => {
      const box = button.getBoundingClientRect();
      return box.width > 0 && box.top >= view.top && box.bottom <= view.bottom;
    });
    return day?.dataset.day;
  });
  expect(disabledDay).toBeDefined();
  const target = picker.locator(`button.day[data-day='${disabledDay}']`);
  const before = await panel.getByTestId("value").textContent();
  // Attempt the user click despite aria-disabled; the component must reject it.
  await target.click({ force: true });
  await expect(panel.getByTestId("value")).toHaveText(before!);
  await expect(
    picker.locator(`button.day[data-day='${days[8]}']`),
  ).toHaveAttribute("aria-label", /\d/);
  await expect(picker.locator("button.day.today")).toHaveAttribute(
    "aria-current",
    "date",
  );
});
test("invalid manual date preserves draft and last committed value", async ({
  page,
}) => {
  const { picker, panel } = await openPicker(page, "invalid-date");
  const before = await panel.getByTestId("value").textContent();
  await picker.getByRole("button", { name: "Manual date entry" }).click();
  const month = picker.getByRole("textbox", { name: "Month", exact: true });
  await month.fill("2");
  await month.press("Enter");
  await expect(
    picker.getByRole("textbox", { name: "Day", exact: true }),
  ).toHaveValue("31");
  await expect(panel.getByTestId("value")).toHaveText(before!);
  await expect(panel.getByTestId("validation")).toContainText(
    "invalid-calendar-date",
  );
  const day = picker.getByRole("textbox", { name: "Day", exact: true });
  await day.fill("28");
  await day.press("Enter");
  await expect(panel.getByTestId("value")).toContainText("2100-02-28");
});
test("horizontal wheel does not change calendar selection", async ({
  page,
}) => {
  const { picker, panel, scroller } = await openPicker(page);
  const before = await panel.getByTestId("value").textContent();
  await scroller.hover();
  await page.mouse.wheel(180, 0);
  await expect(panel.getByTestId("value")).toHaveText(before!);
  await expect(picker.locator(".day.selected")).toHaveCount(1);
});
