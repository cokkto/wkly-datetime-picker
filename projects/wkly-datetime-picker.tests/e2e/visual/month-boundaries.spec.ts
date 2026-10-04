import { test, expect } from "../fixtures";
import { openPicker, visibleDays } from "../helpers/picker";
import { SCREEN_SIZE } from "../helpers/constants";

const cases = [
  {
    name: "Finnish LTR",
    id: "gregorian-pair",
    locale: "fi-FI",
    direction: "ltr",
    value: "2024-12-16T00:00:00.000Z",
    firstDay: "2024-11-25",
    weeks: 6,
    labels: ["marraskuu 2024", "joulukuu 2024", "tammikuu 2025"],
    nextMonth: "2025-01-01",
    firstDayText: "25",
    lastDayText: "1",
    monthStartText: "1",
  },
  {
    name: "Hijri RTL",
    id: "hijri-pair",
    locale: "ar-EG",
    direction: "rtl",
    // Civil Hijri 1444: Jumada I ends on Saturday, December 24, 2022.
    // Jumada II starts on Sunday; Rajab starts in the fifth visible week.
    value: "2023-01-09T00:00:00.000Z",
    firstDay: "2022-12-24",
    weeks: 5,
    labels: ["جمادى الأولى ١٤٤٤", "جمادى الآخرة ١٤٤٤", "رجب ١٤٤٤"],
    nextMonth: "2023-01-23",
    firstDayText: "٣٠",
    lastDayText: "٦",
    monthStartText: "١",
  },
];

for (const fixture of cases) {
  test.describe(`month boundaries ${fixture.name}`, () => {
    for (const width of [SCREEN_SIZE.MOBILE, SCREEN_SIZE.TABLET]) {
      test(`${width} default zoom`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        const { panel, picker, scroller } = await openPicker(
          page,
          fixture.id,
          fixture.locale,
        );
        await expect(picker.locator(".wkly")).toHaveAttribute(
          "dir",
          fixture.direction,
        );
        await panel
          .getByText("Configure this example", { exact: true })
          .click();
        await panel
          .getByLabel("Programmatic UTC value", { exact: true })
          .fill(fixture.value);
        await panel
          .getByRole("button", { name: "Apply value", exact: true })
          .click();
        await expect(panel.getByTestId("value")).toHaveText(
          JSON.stringify(fixture.value),
        );
        await panel
          .getByText("Configure this example", { exact: true })
          .click();

        // Keep the month-sized viewport and reveal the boundary days hidden by
        // the initial full-month preset through normal picker navigation.
        await picker.locator(".week-navigation button").last().click();
        await picker.locator(".week-navigation button").first().click();
        await picker.scrollIntoViewIfNeeded();
        const firstDay = Date.parse(fixture.firstDay + "T00:00:00Z") / 86400000;
        const expectedDays = Array.from(
          { length: fixture.weeks * 7 },
          (_, index) => firstDay + index,
        );
        await expect.poll(() => visibleDays(scroller)).toEqual(expectedDays);

        const cell = (day: number) =>
          picker.locator(`button.day[data-day='${day}']`).locator("..");
        const firstCell = cell(firstDay);
        const lastCell = cell(firstDay + 6);
        const monthStartDay =
          Date.parse(fixture.nextMonth + "T00:00:00Z") / 86400000;
        const monthStartCell = cell(monthStartDay);
        await expect(firstCell).toHaveAttribute("data-weekday-index", "0");
        await expect(lastCell).toHaveAttribute("data-weekday-index", "6");
        await expect(monthStartCell).toHaveAttribute("data-weekday-index", "2");
        expect(Math.floor((monthStartDay - firstDay) / 7)).toBe(
          fixture.weeks - 1,
        );
        await expect(firstCell.locator("button.day")).toHaveText(
          fixture.firstDayText,
        );
        await expect(lastCell.locator("button.day")).toHaveText(
          fixture.lastDayText,
        );
        await expect(monthStartCell.locator("button.day")).toHaveText(
          fixture.monthStartText,
        );

        const labels = [firstCell, lastCell, monthStartCell].map((cell) =>
          cell.locator(".annotation"),
        );
        for (const [index, label] of labels.entries()) {
          await expect(label).toHaveText(fixture.labels[index]);
          await expect(label).toBeVisible();
        }
        await page.mouse.move(width - 1, 999);
        await expect(picker).toHaveScreenshot(
          `month-boundaries-${fixture.locale}-${width}.png`,
          { animations: "disabled" },
        );

        // The scroll viewport is the calendar's actual clipping boundary;
        // Measure the text range, as in the week-boundary staggering checks.
        const bounds = (await scroller.boundingBox())!;
        for (const [index, label] of labels.entries()) {
          const box = (await label.boundingBox())!;
          const context = `${fixture.labels[index]} within calendar`;
          expect
            .soft(box.x, `${context}: left`)
            .toBeGreaterThanOrEqual(bounds.x - 0.5);
          expect
            .soft(box.y, `${context}: top`)
            .toBeGreaterThanOrEqual(bounds.y - 0.5);
          expect
            .soft(box.x + box.width, `${context}: right`)
            .toBeLessThanOrEqual(bounds.x + bounds.width + 0.5);
          expect
            .soft(box.y + box.height, `${context}: bottom`)
            .toBeLessThanOrEqual(bounds.y + bounds.height + 0.5);
        }
      });
    }
  });
}
