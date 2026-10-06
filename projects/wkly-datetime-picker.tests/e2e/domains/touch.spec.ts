import { test, expect, emissions, PickerFixture } from "../fixtures";
import type { Locator } from "@playwright/test";
import { renderedWeekHistory, expectWeekHistory } from "../scroll-history";

const value = "2099-12-16T13:00:00.000Z";
const epoch = Date.UTC(2099, 11, 16) / 86400000;
const day = (host: PickerFixture, date: number) =>
  host.picker.locator(`button.day[data-day="${date}"]`);

type PairAction =
  | { kind: "button"; name: string; method?: "tap" | "click" }
  | { kind: "date"; date: string }
  | { kind: "edit"; field: string; value: string; manual?: boolean }
  | { kind: "drag"; field: string }
  | { kind: "disabled-date" }
  | { kind: "resize" };
type PairState = {
  value: string;
  period: "AM" | "24" | "PM";
  hour: string;
  view?: "calendar" | "manual";
  weekShift?: number;
  landscape?: boolean;
};
type InteractionPair = {
  name: string;
  start: PairState;
  actions: readonly [PairAction, PairAction];
  expected: readonly [PairState, PairState];
};
const afternoon: PairState = { value, period: "24", hour: "13" };
const morning: PairState = {
  value: "2099-12-16T01:00:00.000Z",
  period: "AM",
  hour: "01",
};
const pm: PairState = { ...afternoon, period: "PM", hour: "01" };
// Literal starting states and outcomes cover meaningful interactions, rather than all permutations.
const interactionPairs: readonly InteractionPair[] = [
  {
    name: "24 to AM → hour increment retains AM",
    start: afternoon,
    actions: [
      { kind: "button", name: "AM" },
      { kind: "button", name: "Hour: next" },
    ],
    expected: [
      morning,
      { value: "2099-12-16T02:00:00.000Z", period: "AM", hour: "02" },
    ],
  },
  {
    name: "24 to AM → manual hour input retains AM",
    start: afternoon,
    actions: [
      { kind: "button", name: "AM" },
      { kind: "edit", field: "Hour", value: "03" },
    ],
    expected: [
      morning,
      { value: "2099-12-16T03:00:00.000Z", period: "AM", hour: "03" },
    ],
  },
  {
    name: "AM → PM by taps retains twelve-hour display",
    start: afternoon,
    actions: [
      { kind: "button", name: "AM" },
      { kind: "button", name: "PM" },
    ],
    expected: [morning, pm],
  },
  {
    name: "AM → PM by mouse clicks retains twelve-hour display",
    start: afternoon,
    actions: [
      { kind: "button", name: "AM", method: "click" },
      { kind: "button", name: "PM", method: "click" },
    ],
    expected: [morning, pm],
  },
  {
    name: "PM → date selection preserves time and removes old selection",
    start: morning,
    actions: [
      { kind: "button", name: "PM" },
      { kind: "date", date: "2099-12-17" },
    ],
    expected: [
      pm,
      { value: "2099-12-17T13:00:00.000Z", period: "PM", hour: "01" },
    ],
  },
  {
    name: "date selection → AM preserves the new selected day",
    start: afternoon,
    actions: [
      { kind: "date", date: "2099-12-19" },
      { kind: "button", name: "AM" },
    ],
    expected: [
      { value: "2099-12-19T13:00:00.000Z", period: "24", hour: "13" },
      { value: "2099-12-19T01:00:00.000Z", period: "AM", hour: "01" },
    ],
  },
  {
    name: "24 → PM restores twelve-hour display",
    start: morning,
    actions: [
      { kind: "button", name: "24" },
      { kind: "button", name: "PM" },
    ],
    expected: [{ ...morning, period: "24" }, pm],
  },
  {
    name: "PM → 24 removes the PM pressed state",
    start: morning,
    actions: [
      { kind: "button", name: "PM" },
      { kind: "button", name: "24" },
    ],
    expected: [pm, afternoon],
  },
  {
    name: "previous week → AM preserves selection",
    start: afternoon,
    actions: [
      { kind: "button", name: "Previous week" },
      { kind: "button", name: "AM" },
    ],
    expected: [{ ...afternoon, weekShift: -1 }, morning],
  },
  {
    name: "next week → date selection preserves format",
    start: pm,
    actions: [
      { kind: "button", name: "Next week" },
      { kind: "date", date: "2099-12-23" },
    ],
    expected: [
      { ...pm, weekShift: 1 },
      { value: "2099-12-23T13:00:00.000Z", period: "PM", hour: "01" },
    ],
  },
  {
    name: "AM → manual mode and year input preserves AM",
    start: afternoon,
    actions: [
      { kind: "button", name: "AM" },
      { kind: "edit", field: "Year", value: "2098", manual: true },
    ],
    expected: [
      morning,
      {
        value: "2098-12-16T01:00:00.000Z",
        period: "AM",
        hour: "01",
        view: "manual",
      },
    ],
  },
  {
    name: "previous year → AM preserves edited year",
    start: { ...afternoon, view: "manual" },
    actions: [
      { kind: "button", name: "Year: previous" },
      { kind: "button", name: "AM" },
    ],
    expected: [
      {
        value: "2098-12-16T13:00:00.000Z",
        period: "24",
        hour: "13",
        view: "manual",
      },
      {
        value: "2098-12-16T01:00:00.000Z",
        period: "AM",
        hour: "01",
        view: "manual",
      },
    ],
  },
  {
    name: "manual mode → day input updates classes on reopening",
    start: pm,
    actions: [
      { kind: "button", name: "Manual date entry" },
      { kind: "edit", field: "Day", value: "20" },
    ],
    expected: [
      { ...pm, view: "manual" },
      {
        value: "2099-12-20T13:00:00.000Z",
        period: "PM",
        hour: "01",
        view: "manual",
      },
    ],
  },
  {
    name: "month increment → PM preserves new month",
    start: {
      value: "2099-11-16T01:00:00.000Z",
      period: "AM",
      hour: "01",
      view: "manual",
    },
    actions: [
      { kind: "button", name: "Month: next" },
      { kind: "button", name: "PM" },
    ],
    expected: [
      { ...morning, view: "manual" },
      { ...pm, view: "manual" },
    ],
  },
  {
    name: "Now → AM preserves today's date and marker",
    start: { value: "2098-12-16T13:00:00.000Z", period: "24", hour: "13" },
    actions: [
      { kind: "button", name: "Now" },
      { kind: "button", name: "AM" },
    ],
    expected: [afternoon, morning],
  },
  {
    name: "AM → Now preserves twelve-hour display",
    start: { value: "2098-12-16T13:00:00.000Z", period: "24", hour: "13" },
    actions: [
      { kind: "button", name: "AM" },
      { kind: "button", name: "Now" },
    ],
    expected: [
      { value: "2098-12-16T01:00:00.000Z", period: "AM", hour: "01" },
      pm,
    ],
  },
  {
    name: "resize → date selection preserves PM and classes",
    start: pm,
    actions: [{ kind: "resize" }, { kind: "date", date: "2099-12-19" }],
    expected: [
      { ...pm, landscape: true },
      {
        value: "2099-12-19T13:00:00.000Z",
        period: "PM",
        hour: "01",
        landscape: true,
      },
    ],
  },
  {
    name: "disabled day tap → PM leaves selected date unchanged",
    start: morning,
    actions: [{ kind: "disabled-date" }, { kind: "button", name: "PM" }],
    expected: [morning, pm],
  },
  {
    name: "hour drag → AM preserves dragged hour",
    start: afternoon,
    actions: [
      { kind: "drag", field: "Hour" },
      { kind: "button", name: "AM" },
    ],
    expected: [
      { value: "2099-12-16T14:00:00.000Z", period: "24", hour: "14" },
      { value: "2099-12-16T02:00:00.000Z", period: "AM", hour: "02" },
    ],
  },
  {
    name: "minute increment → PM preserves edited minutes",
    start: morning,
    actions: [
      { kind: "button", name: "Minute: next" },
      { kind: "button", name: "PM" },
    ],
    expected: [
      { value: "2099-12-16T01:01:00.000Z", period: "AM", hour: "01" },
      { value: "2099-12-16T13:01:00.000Z", period: "PM", hour: "01" },
    ],
  },
];

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
      reflectValue: true,
      inputs: {
        mode: "datetime",
        locale: "en-GB",
        hourCycle: "switchable",
        viewportPreset: { kind: "weeks", visibleWeekCount: 4 },
      },
    },
  });
  test("interaction pairs preserve values and rendered selection across active controls", async ({
    host,
  }) => {
    expect(
      await host.page.evaluate(() => navigator.maxTouchPoints),
    ).toBeGreaterThan(0);
    const button = (name: string) =>
      host.picker.getByRole("button", { name, exact: true });
    const input = (name: string) =>
      host.picker.getByRole("textbox", { name, exact: true });
    const activate = async (
      target: Locator,
      method: "tap" | "click" = "tap",
    ) => {
      if (method === "click") await target.click();
      else await target.tap();
    };
    const perform = async (action: PairAction) => {
      switch (action.kind) {
        case "button":
          await activate(button(action.name), action.method);
          break;
        case "date":
          await day(host, Date.parse(action.date) / 86400000).tap();
          break;
        case "edit":
          if (action.manual && (await button("Manual date entry").count()))
            await button("Manual date entry").tap();
          await input(action.field).tap();
          await input(action.field).fill(action.value);
          // Native blur completes pending typing without switching the current view.
          await input(action.field === "Minute" ? "Hour" : "Minute").tap();
          break;
        case "drag":
          await drag(host, input(action.field), [8, 25], async (index) => {
            // Hold before release, as in the scroll tests, to avoid a native fling swallowing the next tap.
            if (index === 1) await host.page.waitForTimeout(300);
          });
          break;
        case "disabled-date": {
          const target = day(host, epoch + 2);
          await target.scrollIntoViewIfNeeded();
          const box = (await target.boundingBox())!;
          // Locator.tap waits for enabled state; send a physical tap to the disabled day.
          await host.page.touchscreen.tap(
            box.x + box.width / 2,
            box.y + box.height / 2,
          );
          break;
        }
        case "resize":
          await host.page.setViewportSize({ width: 844, height: 390 });
          break;
      }
    };
    const visibleWeekStart = () =>
      host.picker.locator(".week-scroll").evaluate((scroll) => {
        const top = scroll.getBoundingClientRect().top;
        const first = Array.from(scroll.querySelectorAll(".week-row")).find(
          (row) => row.getBoundingClientRect().bottom > top + 1,
        )!;
        return Number(first.querySelector<HTMLElement>(".day")!.dataset.day);
      });
    const assertState = async (state: PairState, initialWeek?: number) => {
      await expect
        .poll(async () => (await host.snapshot()).value)
        .toBe(state.value);
      const manual = state.view === "manual";
      expect(host.page.viewportSize()).toEqual(
        state.landscape
          ? { width: 844, height: 390 }
          : { width: 390, height: 844 },
      );
      if (state.weekShift !== undefined)
        await expect
          .poll(visibleWeekStart)
          .toBe(initialWeek! + state.weekShift * 7);
      await expect(host.picker.locator(".date-fields")).toHaveCount(
        manual ? 1 : 0,
      );
      await expect(host.picker.getByRole("grid")).toHaveCount(manual ? 0 : 1);
      await expect(
        button(manual ? "Calendar view" : "Manual date entry"),
      ).toBeVisible();
      for (const period of ["AM", "24", "PM"]) {
        await expect(button(period)).toBeEnabled();
        await expect(button(period)).toHaveAttribute(
          "aria-pressed",
          String(period === state.period),
        );
        await expect(button(period)).toHaveCSS(
          "background-color",
          period === state.period ? "rgb(229, 241, 238)" : "rgba(0, 0, 0, 0)",
        );
      }
      await expect(input("Hour")).toHaveValue(state.hour);
      await expect(input("Minute")).toHaveValue(state.value.slice(14, 16));
      await expect(
        host.picker.locator('input[aria-invalid="true"]'),
      ).toHaveCount(0);
      if (manual) {
        await expect(host.picker.locator(".day.selected")).toHaveCount(0);
        await expect(input("Year")).toHaveValue(state.value.slice(0, 4));
        await expect(input("Day")).toHaveValue(state.value.slice(8, 10));
      } else {
        const selectedDay = Date.parse(state.value.slice(0, 10)) / 86400000;
        await expect(host.picker.locator(".day.selected")).toHaveCount(1);
        await expect(day(host, selectedDay)).toHaveClass(/\bselected\b/);
        await expect(day(host, selectedDay).locator("..")).toHaveAttribute(
          "aria-selected",
          "true",
        );
        await expect(day(host, selectedDay)).toHaveCSS(
          "background-color",
          "rgb(23, 108, 85)",
        );
        if (selectedDay === epoch)
          await expect(day(host, selectedDay)).toHaveClass(/\btoday\b/);
        else await expect(day(host, selectedDay)).not.toHaveClass(/\btoday\b/);
        // Every old selection must lose both its CSS class and accessible selected state.
        await expect(
          host.picker.locator(`.day.selected:not([data-day="${selectedDay}"])`),
        ).toHaveCount(0);
        await expect(
          host.picker.locator('[role="gridcell"][aria-selected="true"]'),
        ).toHaveCount(1);
        await expect(host.picker.locator(".week-row.no-label")).toHaveCount(0);
      }
    };
    const boot = await host.page.evaluate(
      () => window.wklyTestHost.identity().bootId,
    );
    try {
      for (const scenario of interactionPairs) {
        await test.step(scenario.name, async () => {
          await host.page.setViewportSize({ width: 390, height: 844 });
          if (await button("Calendar view").count())
            await button("Calendar view").tap();
          await host.write(scenario.start.value);
          await button(scenario.start.period).tap();
          if (scenario.start.view === "manual")
            await button("Manual date entry").tap();
          await assertState(scenario.start);
          const initialWeek =
            scenario.start.view === "manual"
              ? undefined
              : await visibleWeekStart();
          const expectedEmissions = [...emissions(await host.snapshot())];
          let previous = scenario.start;
          for (const [index, action] of scenario.actions.entries()) {
            await perform(action);
            const expected = scenario.expected[index];
            await assertState(expected, initialWeek);
            if (expected.value !== previous.value)
              expectedEmissions.push(expected.value);
            expect(emissions(await host.snapshot())).toEqual(expectedEmissions);
            previous = expected;
          }
          // Reopening must apply selected classes to manually edited dates too.
          if (previous.view === "manual") {
            await button("Calendar view").tap();
            await assertState({ ...previous, view: "calendar" });
          }
          expect(
            await host.page.evaluate(
              () => window.wklyTestHost.identity().bootId,
            ),
          ).toBe(boot);
        });
      }
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
