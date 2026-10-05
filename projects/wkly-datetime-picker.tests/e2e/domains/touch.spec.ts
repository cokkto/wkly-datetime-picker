import { test, expect, emissions, PickerFixture } from "../fixtures";
import type { Locator } from "@playwright/test";
import { renderedWeekHistory, expectWeekHistory } from "../scroll-history";

const value = "2099-12-16T13:00:00.000Z";
const epoch = Date.UTC(2099, 11, 16) / 86400000;
const day = (host: PickerFixture, date: number) =>
  host.picker.locator(`button.day[data-day="${date}"]`);

// Chromium's input pipeline exercises gesture handling and native scrolling;
// DOM-dispatched TouchEvents would only exercise the component's handlers.
async function drag(
  host: PickerFixture,
  target: Locator,
  distances: number[],
  check?: (index: number) => Promise<void>,
) {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const session = await host.page.context().newCDPSession(host.page);
  try {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (const [index, distance] of distances.entries()) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y - distance }],
      });
      if (check) await check(index);
    }
  } finally {
    try {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } finally {
      await session.detach();
    }
  }
}

test.describe("In X Days gestures", () => {
  test.use({
    suite: "fields",
    spec: {
      inputs: { mode: "date-range", locale: "en-GB" },
      value: ["2099-12-16T00:00:00.000Z", "2099-12-16T00:00:00.000Z"],
    },
  });
  test("dragging below zero previews negative days and swaps the range on release", async ({
    host,
  }) => {
    await host.picker.getByRole("button", { name: "Manual date entry" }).tap();
    const end = host.picker.getByRole("group", { name: "End", exact: true });
    await end.getByRole("button", { name: "In 0 days", exact: true }).tap();
    const input = end.getByRole("textbox", { name: "Days", exact: true });
    await drag(host, input, [-8, -25, -60], async (index) => {
      await expect(input).toHaveValue(["0", "-1", "-2"][index]);
      expect(emissions(await host.snapshot())).toEqual([]);
    });
    await expect
      .poll(async () => (await host.snapshot()).value)
      .toEqual(["2099-12-14T00:00:00.000Z", "2099-12-16T00:00:00.000Z"]);
    await expect(input).toHaveValue("2");
    await expect(
      end.getByRole("button", { name: "In 2 days", exact: true }),
    ).toBeVisible();
    expect(emissions(await host.snapshot())).toHaveLength(1);
  });
});

test.describe("calendar taps", () => {
  test.use({
    suite: "calendar",
    spec: {
      value,
      disabledEpochDays: [epoch + 2],
      inputs: {
        mode: "datetime",
        locale: "en-GB",
        viewportPreset: { kind: "weeks", visibleWeekCount: 4 },
      },
    },
  });
  test("taps select once, disabled days stay inert and resizing preserves selection", async ({
    host,
  }) => {
    expect(
      await host.page.evaluate(() => navigator.maxTouchPoints),
    ).toBeGreaterThan(0);
    await day(host, epoch + 1).tap();
    const selected = "2099-12-17T13:00:00.000Z";
    await expect.poll(async () => (await host.snapshot()).value).toBe(selected);
    // A physical tap must reach the disabled target; locator.tap deliberately waits for enabled state.
    const disabled = (await day(host, epoch + 2).boundingBox())!;
    await host.page.touchscreen.tap(
      disabled.x + disabled.width / 2,
      disabled.y + disabled.height / 2,
    );
    expect(emissions(await host.snapshot())).toEqual([selected]);
    const boot = await host.page.evaluate(
      () => window.wklyTestHost.identity().bootId,
    );
    try {
      await host.page.setViewportSize({ width: 844, height: 390 });
      await expect(day(host, epoch + 1)).toHaveClass(/selected/);
      await host.page.setViewportSize({ width: 390, height: 844 });
      await day(host, epoch + 3).tap();
      await expect
        .poll(async () => (await host.snapshot()).value)
        .toBe("2099-12-19T13:00:00.000Z");
      expect(
        await host.page.evaluate(() => window.wklyTestHost.identity().bootId),
      ).toBe(boot);
      expect(emissions(await host.snapshot())).toEqual([
        selected,
        "2099-12-19T13:00:00.000Z",
      ]);
    } finally {
      await host.page.setViewportSize({ width: 390, height: 844 });
    }
  });
});

test.describe("time field gestures", () => {
  test.use({
    suite: "fields",
    spec: {
      value,
      inputs: { mode: "datetime", locale: "en-GB", hourCycle: "h24" },
    },
  });
  for (const direction of [1, -1]) {
    test(`drag ${direction} previews each threshold and reverses without carrying hours`, async ({
      host,
    }) => {
      const minute = host.picker.getByRole("textbox", {
        name: "Minute",
        exact: true,
      });
      const shown = (steps: number) =>
        String((direction * steps + 60) % 60).padStart(2, "0");
      await drag(
        host,
        minute,
        [8, 25, 60, 25].map((distance) => direction * distance),
        async (index) => {
          await expect(minute).toHaveValue(shown([0, 1, 2, 1][index]));
        },
      );
      await expect
        .poll(async () => (await host.snapshot()).value)
        .toBe(`2099-12-16T13:${shown(1)}:00.000Z`);
      await expect(
        host.picker.getByRole("textbox", { name: "Hour", exact: true }),
      ).toHaveValue("13");
      await host.disable(true);
      const before = emissions(await host.snapshot());
      await drag(host, minute, [25, 60]);
      expect(emissions(await host.snapshot())).toEqual(before);
    });
  }
});

test.describe("native touch scrolling", () => {
  test.use({
    suite: "scrolling",
    spec: {
      value,
      inputs: {
        mode: "date",
        locale: "en-GB",
        viewportPreset: { kind: "weeks", visibleWeekCount: 4 },
      },
    },
  });
  test("small touch deltas leave all rendered weeks unchanged and larger deltas never reverse transiently", async ({
    host,
  }) => {
    const scroll = host.picker.locator(".week-scroll");
    const read = () =>
      scroll.evaluate((element) => {
        const rows = Array.from(element.querySelectorAll(".week-row"));
        return {
          days: rows.map((row) =>
            Number(row.querySelector<HTMLElement>(".day")!.dataset.day),
          ),
          offset:
            rows[3].getBoundingClientRect().top -
            element.getBoundingClientRect().top,
        };
      });
    for (const distance of [16, 60, 180]) {
      const shifts: number[] = [];
      for (const direction of [-1, 1]) {
        await host.page.evaluate(
          (value) => window.wklyTestHost.jump({ method: "value", value }),
          value,
        );
        const before = await read();
        let after = before;
        const history = await renderedWeekHistory(scroll, async () => {
          await drag(
            host,
            scroll,
            [0.25, 0.5, 0.75, 1].map((part) => part * distance * direction),
            async (index) => {
              // Hold before lifting to test displacement without adding flick momentum.
              await host.page.waitForTimeout(index === 3 ? 300 : 50);
            },
          );
          await host.page.waitForTimeout(350);
          await expect
            .poll(async () => Math.abs((await read()).offset))
            .toBeLessThan(1);
          after = await read();
        });
        const shift = (after.days[0] - before.days[0]) / 7;
        shifts.push(shift);
        if (distance === 16) expect(shift).toBe(0);
        else {
          expect(Math.sign(shift)).toBe(direction);
          if (distance === 60) expect(Math.abs(shift)).toBe(1);
          else expect(Math.abs(shift)).toBeGreaterThanOrEqual(2);
        }
        expectWeekHistory(history, before.days, shift);
      }
      expect(shifts[0] + shifts[1]).toBe(0);
    }
    expect(emissions(await host.snapshot())).toEqual([]);
    expect((await host.snapshot()).value).toBe(value);
  });
  test("swipes in both directions settle on whole weeks without selecting a day", async ({
    host,
  }) => {
    const scroll = host.picker.locator(".week-scroll");
    const geometry = () =>
      scroll.evaluate((element) => {
        const rows = Array.from(element.querySelectorAll(".week-row"));
        return {
          count: rows.length,
          first: Number(
            rows[3].querySelector<HTMLElement>(".day")!.dataset.day,
          ),
          offset:
            rows[3].getBoundingClientRect().top -
            element.getBoundingClientRect().top,
        };
      });
    for (const direction of [1, -1]) {
      const before = await geometry();
      await drag(
        host,
        scroll,
        [16, 32, 48, 64, 80].map((distance) => direction * distance),
      );
      await expect(async () => {
        const after = await geometry();
        expect((after.first - before.first) * direction).toBeGreaterThan(0);
        expect(Math.abs((after.first - before.first) % 7)).toBe(0);
        expect(Math.abs(after.offset)).toBeLessThan(1);
        expect(after.count).toBe(10);
      }).toPass({ timeout: 5000 });
    }
    expect(emissions(await host.snapshot())).toEqual([]);
  });
});
