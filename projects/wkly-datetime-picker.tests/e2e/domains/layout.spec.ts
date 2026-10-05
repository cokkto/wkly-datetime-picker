import { test, expect, PickerFixture, emissions } from "../fixtures";

const value = "2024-12-16T00:00:00.000Z";

test.describe("default narrow touch targets", () => {
  test.use({
    suite: "narrow",
    spec: {
      value,
      inputs: {
        mode: "date",
        locale: "en-GB",
        viewportPreset: { kind: "weeks", visibleWeekCount: 4 },
      },
    },
  });
  test("default day targets stay at least 44px at 320px without horizontal overflow", async ({
    host,
  }) => {
    await expect
      .poll(() =>
        host.picker
          .locator("button.day.selected")
          .evaluate((day) => day.getBoundingClientRect().width),
      )
      .toBeGreaterThanOrEqual(44);
    const box = (await host.picker
      .locator("button.day.selected")
      .boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(
      await host.page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
  });
});

async function completeWeeks(
  host: PickerFixture,
  rtl: boolean,
  after?: number,
) {
  let first = 0;
  // Geometry must settle after Angular renders and the scroller snaps to a week.
  await expect(async () => {
    const geometry = await host.picker
      .locator(".week-scroll")
      .evaluate((scroll) => {
        const bounds = scroll.getBoundingClientRect();
        return {
          height: bounds.height,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          rows: Array.from(scroll.querySelectorAll(".week-row"))
            .filter((row) => {
              const rect = row.getBoundingClientRect();
              return (
                rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1
              );
            })
            .map((row) => ({
              height: row.getBoundingClientRect().height,
              days: Array.from(
                row.querySelectorAll<HTMLElement>("button.day"),
              ).map((day) => {
                const rect = day.getBoundingClientRect();
                return {
                  epoch: Number(day.dataset.day),
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  inside:
                    rect.left >= bounds.left - 1 &&
                    rect.right <= bounds.right + 1,
                };
              }),
            })),
        };
      });
    expect(geometry.overflow).toBeLessThanOrEqual(1);
    expect(geometry.rows).toHaveLength(4);
    first = geometry.rows[0].days[0].epoch;
    if (after !== undefined) expect(first).toBeGreaterThan(after);
    expect(
      Math.abs(geometry.height - geometry.rows[0].height * 4),
    ).toBeLessThanOrEqual(1);
    for (const row of geometry.rows) {
      expect(row.days).toHaveLength(7);
      for (const [index, day] of row.days.entries()) {
        expect(day.inside).toBe(true);
        expect(day.epoch).toBe(row.days[0].epoch + index);
        expect(Math.abs(day.y - row.days[0].y)).toBeLessThanOrEqual(1);
        expect(Math.abs(day.width - row.days[0].width)).toBeLessThanOrEqual(1);
        if (index)
          expect(
            (day.x - row.days[index - 1].x) * (rtl ? -1 : 1),
          ).toBeGreaterThan(0);
      }
    }
  }).toPass({ timeout: 5000 });
  return first;
}

for (const suite of [
  "narrow",
  "tablet",
  "desktop",
  "zoom-out",
  "zoom-125",
  "zoom-150",
]) {
  test.describe(suite, () => {
    test.use({
      suite,
      spec: {
        value,
        inputs: {
          mode: "date",
          locale: "en-GB",
          viewportPreset: { kind: "weeks", visibleWeekCount: 4 },
        },
      },
    });

    test("complete weeks survive navigation, scrolling, sizing and RTL", async ({
      host,
    }) => {
      for (const multiplier of [1, 1.15]) {
        await host.picker.evaluate(
          (picker, size) =>
            (picker as HTMLElement).style.setProperty(
              "--wkly-size-multiplier",
              String(size),
            ),
          multiplier,
        );
        for (const locale of ["en-GB", "ar"]) {
          await host.inputs({ locale });
          const first = await completeWeeks(host, locale === "ar");
          await host.picker.locator(".week-navigation button").last().click();
          const next = await completeWeeks(host, locale === "ar", first);
          await host.picker.locator(".week-scroll").evaluate((scroll) => {
            scroll.scrollTop += scroll.clientHeight * 0.35;
          });
          await completeWeeks(host, locale === "ar", next);
        }
      }
      expect((await host.snapshot()).value).toBe(value);
      expect(emissions(await host.snapshot())).toEqual([]);
    });

    test("theme colors, focus and accessibility media preserve selection", async ({
      host,
    }) => {
      await host.picker.evaluate((picker) => {
        const style = (picker as HTMLElement).style;
        style.setProperty("--wkly-accent-color", "rgb(90, 30, 120)");
        style.setProperty("--wkly-accent-text-color", "rgb(255, 240, 210)");
        style.setProperty("--wkly-focus-color", "rgb(20, 80, 190)");
      });
      const selected = host.picker.locator(".day.selected");
      await expect(selected).toHaveCSS("background-color", "rgb(90, 30, 120)");
      await expect(selected).toHaveCSS("color", "rgb(255, 240, 210)");
      await host.page.keyboard.press("Tab");
      await selected.focus();
      await expect(selected).toHaveCSS("outline-color", "rgb(20, 80, 190)");
      try {
        await host.page.emulateMedia({
          forcedColors: "active",
          reducedMotion: "reduce",
        });
        await expect(selected).toHaveCSS("outline-style", "solid");
        const outline = await selected.evaluate((element) => {
          const reference = document.createElement("span");
          reference.style.outline = "2px solid";
          element.parentElement!.appendChild(reference);
          const widths = {
            actual: parseFloat(getComputedStyle(element).outlineWidth),
            expected: parseFloat(getComputedStyle(reference).outlineWidth),
          };
          reference.remove();
          return widths;
        });
        // Compare against a CSS 2px reference in the same zoom/media context;
        // computed widths vary with engine pixel rounding and platform scaling.
        expect(outline.expected).toBeGreaterThan(0);
        expect(Math.abs(outline.actual - outline.expected)).toBeLessThan(0.02);
        await expect(selected).toHaveCSS("animation-name", "none");
        await expect(host.picker.locator(".week-scroll")).toHaveCSS(
          "scroll-behavior",
          "auto",
        );
        await completeWeeks(host, false);
      } finally {
        // Media emulation belongs to the reusable page and outlives this fixture.
        await host.page.emulateMedia({
          forcedColors: "none",
          reducedMotion: "reduce",
        });
      }
      expect((await host.snapshot()).value).toBe(value);
      expect(emissions(await host.snapshot())).toEqual([]);
    });
  });
}

const boundaries = [
  {
    calendar: "gregorian",
    locale: "fi-FI",
    value,
    first: "2024-11-25",
    next: "2025-01-01",
    weeks: 6,
    labels: ["marraskuu 2024", "joulukuu 2024", "tammikuu 2025"],
  },
  {
    calendar: "hijri",
    locale: "ar-EG",
    value: "2023-01-09T00:00:00.000Z",
    first: "2022-12-24",
    next: "2023-01-23",
    weeks: 5,
    labels: ["جمادى الأولى ١٤٤٤", "جمادى الآخرة ١٤٤٤", "رجب ١٤٤٤"],
  },
] as const;
for (const suite of ["narrow", "tablet"]) {
  for (const boundary of boundaries) {
    test.describe(`${suite} ${boundary.locale} month boundaries`, () => {
      test.use({
        suite,
        spec: {
          calendar: boundary.calendar,
          value: boundary.value,
          inputs: {
            mode: "date",
            locale: boundary.locale,
            viewportPreset: { kind: "full-month" },
          },
        },
      });
      test("adjacent months remain complete and labels stay inside the viewport", async ({
        host,
      }) => {
        // Reveal adjacent-month days while retaining the month-sized viewport.
        await host.picker.locator(".week-navigation button").last().click();
        await host.picker.locator(".week-navigation button").first().click();
        const first = Date.parse(boundary.first + "T00:00:00Z") / 86400000;
        await expect(async () => {
          const visible = await host.picker
            .locator(".week-scroll")
            .evaluate((scroll) => {
              const bounds = scroll.getBoundingClientRect();
              return Array.from(
                scroll.querySelectorAll<HTMLElement>("button.day"),
              )
                .filter((day) => {
                  const box = day.getBoundingClientRect();
                  // Round relative edges to tolerate fractional scroll
                  // positions without bias from the viewport's origin.
                  return (
                    Math.round(box.top - bounds.top) >= 0 &&
                    Math.round(box.bottom - bounds.bottom) <= 0 &&
                    box.width > 0
                  );
                })
                .map((day) => Number(day.dataset.day));
            });
          expect(visible).toEqual(
            Array.from(
              { length: boundary.weeks * 7 },
              (_, index) => first + index,
            ),
          );
        }).toPass({ timeout: 5000 });
        const bounds = (await host.picker
          .locator(".week-scroll")
          .boundingBox())!;
        const epochs = [
          first,
          first + 6,
          Date.parse(boundary.next + "T00:00:00Z") / 86400000,
        ];
        const boxes = [];
        for (const [index, epoch] of epochs.entries()) {
          const cell = host.picker
            .locator(`button.day[data-day="${epoch}"]`)
            .locator("..");
          await expect(cell).toHaveAttribute(
            "data-weekday-index",
            String([0, 6, 2][index]),
          );
          const label = cell.locator(".annotation");
          await expect(label).toHaveText(boundary.labels[index]);
          const box = (await label.boundingBox())!;
          expect(box.x).toBeGreaterThanOrEqual(bounds.x - 1);
          expect(box.y).toBeGreaterThanOrEqual(bounds.y - 1);
          expect(box.x + box.width).toBeLessThanOrEqual(
            bounds.x + bounds.width + 1,
          );
          expect(box.y + box.height).toBeLessThanOrEqual(
            bounds.y + bounds.height + 1,
          );
          boxes.push(
            await label.evaluate((element) => {
              const range = document.createRange();
              range.selectNodeContents(element);
              const rect = range.getBoundingClientRect();
              return {
                x: rect.x,
                y: rect.y,
                right: rect.right,
                height: rect.height,
              };
            }),
          );
        }
        // The two month labels in the first week must occupy different vertical bands when they overlap horizontally.
        const [a, b] = boxes;
        if (a.x < b.right && b.x < a.right)
          expect(Math.abs(a.y - b.y)).toBeGreaterThanOrEqual(
            Math.min(a.height, b.height) / 2,
          );
        expect((await host.snapshot()).value).toBe(boundary.value);
        expect(emissions(await host.snapshot())).toEqual([]);
        await host.page.mouse.move(0, 999);
        await expect(host.picker).toHaveScreenshot(
          `month-boundaries-${boundary.locale}-${suite}.png`,
          { animations: "disabled" },
        );
      });
    });
  }
}
