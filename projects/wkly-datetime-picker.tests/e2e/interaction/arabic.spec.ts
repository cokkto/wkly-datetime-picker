import { test, expect } from "../fixtures";
import { openPicker, visibleDays } from "../helpers/picker";

test("Arabic range selection orders endpoints and exposes selected state", async ({
  page,
}) => {
  const { picker, panel, scroller } = await openPicker(
    page,
    "date-range",
    "ar",
  );
  const days = await visibleDays(scroller);
  const later = picker.locator(`button.day[data-day='${days[10]}']`);
  const earlier = picker.locator(`button.day[data-day='${days[8]}']`);
  await later.click();
  await earlier.click();
  await expect(panel.getByTestId("value")).toHaveText(
    JSON.stringify([
      new Date(days[8] * 86400000).toISOString(),
      new Date(days[10] * 86400000).toISOString(),
    ]),
  );
  await expect(earlier.locator("..")).toHaveAttribute("aria-selected", "true");
  await expect(later.locator("..")).toHaveAttribute("aria-selected", "true");
  await expect(panel.getByTestId("validation")).toHaveText("valid");
});

test("Arabic calendar navigation, keyboard selection and localized time entry", async ({
  page,
}) => {
  const { picker, panel, scroller } = await openPicker(page, "arabic");
  const before = await panel.getByTestId("value").textContent();
  const days = await visibleDays(scroller);
  await picker
    .getByRole("button", { name: "الأسبوع التالي", exact: true })
    .click();
  await expect
    .poll(async () => (await visibleDays(scroller))[0])
    .toBe(days[0] + 7);
  await picker
    .getByRole("button", { name: "الأسبوع السابق", exact: true })
    .click();
  await expect.poll(() => visibleDays(scroller)).toEqual(days);
  await expect(panel.getByTestId("value")).toHaveText(before!);
  const day = picker.locator(`button.day[data-day='${days[8]}']`);
  await expect(day).toHaveAttribute("aria-label", /[\u0600-\u06ff]/);
  await day.focus();
  await expect(day).toBeFocused();
  await page.keyboard.press("ArrowDown");
  const next = picker.locator(`button.day[data-day='${days[8] + 7}']`);
  await expect(next).toBeFocused();
  await page.keyboard.press("Enter");
  const date = new Date((days[8] + 7) * 86400000).toISOString().slice(0, 10);
  await expect(panel.getByTestId("value")).toHaveText(
    JSON.stringify(`${date}T13:00:00.000Z`),
  );
  const minute = picker.getByRole("textbox", { name: "الدقيقة", exact: true });
  await minute.fill("١٥");
  await minute.press("Enter");
  await expect(panel.getByTestId("value")).toHaveText(
    JSON.stringify(`${date}T13:15:00.000Z`),
  );
  await expect(panel.getByTestId("validation")).toHaveText("valid");
});

test("Arabic manual date preserves an invalid draft and accepts localized digits", async ({
  page,
}) => {
  const { picker, panel } = await openPicker(page, "invalid-date", "ar");
  const before = await panel.getByTestId("value").textContent();
  await picker
    .getByRole("button", { name: "إدخال التاريخ يدويًا", exact: true })
    .click();
  const month = picker.getByRole("textbox", { name: "الشهر", exact: true });
  await month.fill("٢");
  await month.press("Enter");
  await expect(panel.getByTestId("validation")).toHaveText(
    "invalid-calendar-date",
  );
  await expect(panel.getByTestId("value")).toHaveText(before!);
  const day = picker.getByRole("textbox", { name: "اليوم", exact: true });
  await day.fill("٢٨");
  await day.press("Enter");
  await expect(panel.getByTestId("value")).toHaveText(
    JSON.stringify("2100-02-28T00:00:00.000Z"),
  );
  await expect(panel.getByTestId("validation")).toHaveText("valid");
});
