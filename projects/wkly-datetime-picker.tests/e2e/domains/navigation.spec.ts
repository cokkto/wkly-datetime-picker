import { test, expect, emissions, PickerFixture } from "../fixtures";
import type { JumpRequest } from "../../host/protocol";
import type { WklyViewportChange } from "wkly-datetime-picker";
import { renderedWeekHistory, expectWeekHistory } from "../scroll-history";
import { weekColumns } from "../week-columns";

const value = "2099-12-16T00:00:00.000Z";
const today = Date.UTC(2099, 11, 16) / 86400000;
const day = (host: PickerFixture, epoch: number) =>
  host.picker.locator(`button.day[data-day="${epoch}"]`);
const jump = (host: PickerFixture, request: JumpRequest) =>
  host.page.evaluate((request) => window.wklyTestHost.jump(request), request);
async function viewport(host: PickerFixture) {
  const events = (await host.snapshot()).events.filter(
    (event) => event.name === "viewportChange",
  );
  expect(events.length).toBeGreaterThan(0);
  return events[events.length - 1].value as WklyViewportChange;
}
async function geometry(host: PickerFixture) {
  return host.picker
    .locator(".week-scroll")
    .evaluate((element: HTMLElement) => {
      const bounds = element.getBoundingClientRect();
      const rows = Array.from(
        element.querySelectorAll<HTMLElement>(".week-row"),
      );
      const first = rows[3];
      return {
        days: rows.map((row) =>
          Number(row.querySelector(".day")?.getAttribute("data-day")),
        ),
        count: rows.length,
        offset: first.getBoundingClientRect().top - bounds.top,
        annotation: first.querySelector(".annotation")?.textContent?.trim(),
      };
    });
}
async function settled(host: PickerFixture) {
  let first = 0;
  // Outputs can precede Angular's DOM update after a real browser click.
  // Wait for row geometry and the public viewport report to agree.
  await expect(async () => {
    const state = await geometry(host);
    const reported = await viewport(host);
    expect(Math.abs(state.offset)).toBeLessThan(1);
    expect(state.count).toBe(10);
    expect(state.days).toEqual(
      state.days.map((_, index) => state.days[0] + index * 7),
    );
    expect(state.days[3]).toBe(reported.firstVisibleAbsoluteWeek * 7 + 3);
    expect(
      reported.lastVisibleAbsoluteWeek - reported.firstVisibleAbsoluteWeek,
    ).toBe(3);
    expect(state.annotation).toBeTruthy();
    first = reported.firstVisibleAbsoluteWeek;
  }).toPass({ timeout: 5000 });
  expect((await host.snapshot()).value).toBe(value);
  expect(emissions(await host.snapshot())).toEqual([]);
  return first;
}

test.describe("navigation and accessibility", () => {
  test.use({
    suite: "navigation",
    spec: {
      inputs: {
        mode: "date",
        locale: "en-GB",
        weekOffset: 3,
        viewportPreset: { kind: "weeks", visibleWeekCount: 4 },
        ariaLabel: "Booking date",
        ariaDescribedBy: "focus-sentinel",
      },
      value,
    },
  });

  test("grid names, columns, current date and range selection are exposed", async ({
    host,
  }) => {
    const grid = host.picker.getByRole("grid", {
      name: "Booking date",
      exact: true,
    });
    await expect(grid).toHaveAttribute("aria-multiselectable", "false");
    await expect(host.picker.locator("section.wkly")).toHaveAttribute(
      "aria-describedby",
      "focus-sentinel",
    );
    await expect(day(host, today)).toHaveAttribute("aria-current", "date");
    await expect(day(host, today)).toHaveAttribute(
      "aria-label",
      "Wednesday, 16 December 2099",
    );
    const row = host.picker.locator(".week-row").nth(3);
    await expect(row.getByRole("gridcell")).toHaveCount(7);
    const start = (await row.getByRole("rowheader").count()) ? 2 : 1;
    for (let index = 0; index < 7; index++)
      await expect(row.getByRole("gridcell").nth(index)).toHaveAttribute(
        "aria-colindex",
        String(start + index),
      );
    for (const weekLabelMode of ["hidden", "locale"] as const) {
      await host.inputs({ weekLabelMode });
      await weekColumns(host, weekLabelMode !== "hidden");
      expect((await host.snapshot()).value).toBe(value);
      expect(emissions(await host.snapshot())).toEqual([]);
    }
    await host.inputs({ mode: "date-range" });
    await host.write([value, value]);
    await expect(grid).toHaveAttribute("aria-multiselectable", "true");
    await expect(day(host, today).locator("..")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await host.disable(true);
    await expect(day(host, today)).toHaveAttribute("aria-disabled", "true");
  });

  test("keyboard crosses weeks, pages and years without committing focus in either direction", async ({
    host,
  }) => {
    for (const locale of ["en-GB", "ar"]) {
      await host.inputs({ locale });
      await jump(host, {
        method: "epoch",
        value: today,
        options: { focus: true },
      });
      let target = today;
      for (const [key, delta] of [
        ["ArrowRight", 1],
        ["ArrowDown", 7],
        ["PageDown", 7],
        ["Shift+PageDown", 28],
        ["Shift+PageUp", -28],
        ["PageUp", -7],
        ["ArrowUp", -7],
        ["ArrowLeft", -1],
      ] as const) {
        await host.page.keyboard.press(key);
        target += delta;
        await expect(day(host, target)).toBeFocused();
        expect((await host.snapshot()).value).toBe(value);
        expect(emissions(await host.snapshot())).toEqual([]);
      }
      await host.page.keyboard.press("Home");
      await expect(day(host, today)).toBeFocused();
    }
    await host.page.keyboard.press("ArrowRight");
    await expect(day(host, today + 1)).toBeFocused();
    await host.page.keyboard.press("Enter");
    expect((await host.snapshot()).value).toBe("2099-12-17T00:00:00.000Z");
    expect(emissions(await host.snapshot())).toEqual([
      "2099-12-17T00:00:00.000Z",
    ]);
  });

  test("resizing after week navigation preserves selection and keyboard focus in the same page", async ({
    host,
  }) => {
    try {
      for (const width of [768, 320, 1280]) {
        await host.picker
          .getByRole("button", { name: "Next week", exact: true })
          .click();
        await host.picker
          .getByRole("button", { name: "Previous week", exact: true })
          .click();
        await day(host, today).focus();
        await host.page.setViewportSize({ width, height: 900 });
        await expect(day(host, today)).toBeFocused();
        await expect(day(host, today)).toHaveClass(/selected/);
        await host.page.keyboard.press("ArrowRight");
        await expect(day(host, today + 1)).toBeFocused();
        await host.page.keyboard.press("ArrowLeft");
        await expect(day(host, today)).toBeFocused();
        expect((await host.snapshot()).value).toBe(value);
        expect(emissions(await host.snapshot())).toEqual([]);
        expect(
          await host.page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
      }
    } finally {
      await host.page.setViewportSize({ width: 1280, height: 900 });
    }
  });

  for (const method of ["epoch", "week", "calendar", "value"] as const) {
    test(`public ${method} jumps keep synchronous tab stops and focus at pre-epoch and Gregorian boundaries`, async ({
      host,
    }) => {
      for (const target of [-16, -719528, 2932896]) {
        const date = new Date(target * 86400000);
        const request: JumpRequest =
          method === "week"
            ? { method, value: Math.floor((target - 3) / 7) }
            : method === "calendar"
              ? {
                  method,
                  value: {
                    calendarId: "gregory",
                    year: date.getUTCFullYear(),
                    month: date.getUTCMonth() + 1,
                    monthCode: `M${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
                    day: date.getUTCDate(),
                  },
                }
              : method === "value"
                ? { method, value: date.toISOString() }
                : { method, value: target };
        const expected =
          method === "week"
            ? Math.max(-719528, Math.floor((target - 3) / 7) * 7 + 3)
            : target;
        expect(
          await jump(host, { ...request, options: { focus: true } }),
        ).toEqual([expected]);
        const button = day(host, expected);
        await expect(button).toBeFocused();
        await expect
          .poll(() =>
            button.evaluate((element) => {
              const bounds = element.getBoundingClientRect();
              const view = element
                .closest(".week-scroll")!
                .getBoundingClientRect();
              return (
                bounds.top >= view.top - 1 && bounds.bottom <= view.bottom + 1
              );
            }),
          )
          .toBe(true);
        expect((await host.snapshot()).value).toBe(value);
        expect(emissions(await host.snapshot())).toEqual([]);
        await expect(host.picker.locator(".week-row")).toHaveCount(10);
      }
    });
  }

  test("boundary navigation stops at supported weeks with blank overscan rows", async ({
    host,
  }) => {
    for (const [target, name, side, key] of [
      [-719528, "Previous week", "before", "ArrowLeft"],
      [2932896, "Next week", "after", "ArrowRight"],
    ] as const) {
      await jump(host, {
        method: "epoch",
        value: target,
        options: { focus: true },
      });
      await expect(
        host.picker.getByRole("button", { name, exact: true }),
      ).toBeDisabled();
      await host.page.keyboard.press(key);
      await expect(day(host, target)).toBeFocused();
      const rows = host.picker.locator(".week-row");
      for (let index = 0; index < 3; index++)
        await expect(
          rows.nth(side === "before" ? index : 7 + index),
        ).toHaveText("");
      expect((await host.snapshot()).value).toBe(value);
      expect(emissions(await host.snapshot())).toEqual([]);
    }
  });

  test("full-month navigation advances one week from either month edge", async ({
    host,
  }) => {
    await host.inputs({ viewportPreset: { kind: "full-month" } });
    for (const [iso, direction] of [
      ["2099-12-01T00:00:00.000Z", 1],
      ["2099-12-31T00:00:00.000Z", -1],
    ] as const) {
      await host.write(iso);
      for (let index = 0; index < 3; index++) {
        const before = (await viewport(host)).firstVisibleAbsoluteWeek;
        await host.picker
          .getByRole("button", {
            name: direction === 1 ? "Next week" : "Previous week",
            exact: true,
          })
          .click();
        await expect
          .poll(async () => (await viewport(host)).firstVisibleAbsoluteWeek)
          .toBe(before + direction);
        expect((await host.snapshot()).value).toBe(iso);
      }
    }
    expect(emissions(await host.snapshot())).toEqual([]);
  });

  test("jump selection is opt-in and repeated selection is silent", async ({
    host,
  }) => {
    for (const align of ["start", "center", "end"] as const) {
      await jump(host, {
        method: "epoch",
        value: today + 40,
        options: { align },
      });
      expect(emissions(await host.snapshot())).toEqual([]);
    }
    for (let index = 0; index < 2; index++)
      await jump(host, {
        method: "value",
        value: "2100-01-25T00:00:00.000Z",
        options: { select: true, focus: true },
      });
    expect(emissions(await host.snapshot())).toEqual([
      "2100-01-25T00:00:00.000Z",
    ]);
  });
});

for (const suite of ["scrolling", "scrolling-narrow"]) {
  test.describe(suite, () => {
    test.use({
      suite,
      spec: {
        inputs: {
          mode: "date",
          locale: "en-GB",
          weekOffset: 3,
          viewportPreset: { kind: "weeks", visibleWeekCount: 4 },
        },
        value,
      },
    });
    test("repeated week buttons reverse across the year boundary", async ({
      host,
    }) => {
      const initial = await settled(host);
      for (const direction of [1, -1]) {
        for (let index = 0; index < 4; index++) {
          const before = await settled(host);
          await host.picker
            .getByRole("button", {
              name: direction === 1 ? "Next week" : "Previous week",
              exact: true,
            })
            .click();
          await expect
            .poll(async () => (await viewport(host)).firstVisibleAbsoluteWeek)
            .toBe(before + direction);
          expect(await settled(host)).toBe(before + direction);
        }
      }
      expect(await settled(host)).toBe(initial);
    });

    test("wheel deltas settle symmetrically, preserve buffer rows and do not commit", async ({
      host,
    }) => {
      const scroll = host.picker.locator(".week-scroll");
      for (const distance of [16, 60, 180]) {
        const shifts: number[] = [];
        for (const direction of [-1, 1]) {
          await jump(host, { method: "epoch", value: today });
          const before = await settled(host);
          const beforeDays = (await geometry(host)).days;
          await scroll.hover();
          let after = before;
          const history = await renderedWeekHistory(scroll, async () => {
            await host.page.mouse.wheel(0, distance * direction);
            // Include browser delivery and scroll-end debounce before inspecting history.
            await host.page.waitForTimeout(350);
            after = await settled(host);
          });
          const shift = after - before;
          expectWeekHistory(history, beforeDays, shift);
          shifts.push(shift);
          if (distance === 16) expect(shift).toBe(0);
          else {
            expect(Math.sign(shift)).toBe(direction);
            expect(Math.abs(shift)).toBeGreaterThanOrEqual(
              distance === 60 ? 1 : 2,
            );
          }
          await scroll.dispatchEvent("scrollend");
          expect(await settled(host)).toBe(after);
          await host.picker
            .getByRole("button", { name: "Next week", exact: true })
            .click();
          expect(await settled(host)).toBe(after + 1);
        }
        expect(shifts[0] + shifts[1]).toBe(0);
      }
    });

    test("real wheel input settles enlarged rows before week buttons advance exactly one row", async ({
      host,
    }) => {
      const scroll = host.picker.locator(".week-scroll");
      const row = host.picker.locator(".week-row").nth(3);
      const original = (await row.boundingBox())!.height;
      await host.picker.evaluate((picker) =>
        (picker as HTMLElement).style.setProperty(
          "--wkly-size-multiplier",
          "1.15",
        ),
      );
      await expect
        .poll(async () => (await row.boundingBox())!.height)
        .toBeGreaterThan(original * 1.1);
      for (const direction of [1, -1]) {
        const before = await settled(host);
        await scroll.hover();
        await host.page.mouse.wheel(0, direction * 120);
        await expect
          .poll(async () => (await viewport(host)).firstVisibleAbsoluteWeek)
          .not.toBe(before);
        const after = await settled(host);
        expect(Math.sign(after - before)).toBe(direction);
        for (const [name, delta] of [
          ["Next week", 1],
          ["Previous week", -1],
        ] as const) {
          const current = await settled(host);
          await host.picker.getByRole("button", { name, exact: true }).click();
          expect(await settled(host)).toBe(current + delta);
        }
      }
    });

    test("long scrolling keeps rendered rows bounded and horizontal wheel leaves selection alone", async ({
      host,
    }) => {
      const scroll = host.picker.locator(".week-scroll");
      await scroll.hover();
      const initial = await settled(host);
      await host.page.mouse.wheel(180, 0);
      await host.page.waitForTimeout(350);
      expect(await settled(host)).toBe(initial);
      for (const amount of [100000, -100000, 50000]) {
        const before = await settled(host);
        await scroll.evaluate((element, delta) => {
          element.scrollTop += delta;
          element.dispatchEvent(new Event("scroll"));
        }, amount);
        await expect
          .poll(async () => (await viewport(host)).firstVisibleAbsoluteWeek)
          .not.toBe(before);
        await scroll.dispatchEvent("scrollend");
        await settled(host);
      }
      await jump(host, { method: "value", value, options: { focus: true } });
      await expect(day(host, today)).toBeFocused();
      await settled(host);
    });
  });
}
