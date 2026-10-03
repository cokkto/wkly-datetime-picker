import { test, expect } from "./fixtures";
import type { Locator } from "@playwright/test";

const BUFFER_WEEKS = 3;

async function visibleWeek(
  panel: Locator,
): Promise<{ first: number; topDay: number }> {
  const viewport = await panel.getByTestId("viewport").textContent();
  const match = viewport?.match(/Absolute weeks (-?\d+) …/);
  if (!match) throw new Error(`Unexpected viewport: ${viewport}`);
  const topDay = await panel
    .locator(".week-scroll")
    .evaluate((scroller: HTMLElement) => {
      const viewport = scroller.getBoundingClientRect();
      const row = Array.from(
        scroller.querySelectorAll<HTMLElement>(".week-row"),
      ).find((candidate) => {
        const bounds = candidate.getBoundingClientRect();
        return (
          bounds.bottom > viewport.top + 1 && bounds.top < viewport.bottom - 1
        );
      });
      const day = row?.querySelector(".day")?.getAttribute("data-day");
      if (!day) throw new Error("No visible week row");
      return Number(day);
    });
  return { first: Number(match[1]), topDay };
}

async function expectOneWeekMove(
  panel: Locator,
  direction: -1 | 1,
): Promise<void> {
  const before = await visibleWeek(panel);
  await panel
    .getByRole("button", {
      name: direction === 1 ? "Next week" : "Previous week",
    })
    .click();
  await expect
    .poll(async () => (await visibleWeek(panel)).first)
    .toBe(before.first + direction);
  expect((await visibleWeek(panel)).topDay).toBe(before.topDay + 7 * direction);
}

async function topRowOffset(scroller: Locator): Promise<number> {
  return scroller.evaluate((element: HTMLElement) => {
    const top = element.getBoundingClientRect().top;
    const rows = Array.from(element.querySelectorAll<HTMLElement>(".week-row"));
    if (!rows.length) throw new Error("No week row");
    return Math.min(
      ...rows.map((row) => Math.abs(row.getBoundingClientRect().top - top)),
    );
  });
}

test("week buttons show a new row on every repeated click", async ({
  page,
}) => {
  await page.goto("/virtualization");
  const panel = page.getByTestId("virtual-weeks");
  for (let i = 0; i < 4; i++) await expectOneWeekMove(panel, 1);
  for (let i = 0; i < 4; i++) await expectOneWeekMove(panel, -1);
});

test("Hebrew scrolling stops with three blank buffer weeks at each edge", async ({
  page,
}) => {
  for (const [value, delta, bufferSide] of [
    ["1900-01-01T13:00:00.000Z", -100000, "before"],
    ["2100-12-31T13:00:00.000Z", 100000, "after"],
  ] as const) {
    await page.goto("/localization");
    const panel = page.getByTestId("hebrew");
    await panel.getByText("Configure this example").click();
    await panel.getByLabel("Programmatic UTC value").fill(value);
    await panel.getByRole("button", { name: "Apply value" }).click();
    const scroller = panel.locator(".week-scroll");
    await scroller.evaluate((element, amount) => {
      element.scrollTop += amount;
      element.dispatchEvent(new Event("scroll"));
    }, delta);
    await page.waitForTimeout(250);
    const state = await scroller.evaluate((element, bufferWeeks) => {
      const rows = Array.from(
        element.querySelectorAll<HTMLElement>(".week-row"),
      );
      const visible = rows.slice(bufferWeeks, -bufferWeeks);
      const hasDate = (row: HTMLElement) =>
        Array.from(row.querySelectorAll<HTMLElement>(".day")).some((day) =>
          Boolean(day.textContent?.trim()),
        );
      const buffer = bufferWeeks === 0 ? [] : rows.slice(0, bufferWeeks);
      const trailing = rows.slice(-bufferWeeks);
      return {
        rowCount: rows.length,
        visibleCount: visible.length,
        visibleHasDates: visible.every(hasDate),
        leadingBlank: buffer.every((row) => !row.textContent?.trim()),
        trailingBlank: trailing.every((row) => !row.textContent?.trim()),
        topOffset:
          rows[bufferWeeks].getBoundingClientRect().top -
          element.getBoundingClientRect().top,
      };
    }, BUFFER_WEEKS);
    expect(state.rowCount).toBe(state.visibleCount + 2 * BUFFER_WEEKS);
    expect(state.visibleHasDates).toBe(true);
    expect(Math.abs(state.topOffset)).toBeLessThan(1);
    if (bufferSide === "before") {
      expect(state.leadingBlank).toBe(true);
      await expect(
        panel.locator(".week-navigation button").first(),
      ).toBeDisabled();
    } else {
      expect(state.trailingBlank).toBe(true);
      await expect(
        panel.locator(".week-navigation button").last(),
      ).toBeDisabled();
    }
  }
});

test("week buttons advance one row after mouse-wheel scrolling", async ({
  page,
}) => {
  await page.goto("/virtualization");
  const panel = page.getByTestId("virtual-weeks");
  const beforeWheel = await visibleWeek(panel);
  await panel.locator(".week-scroll").hover();
  await page.mouse.wheel(0, 380);
  await expect
    .poll(async () => (await visibleWeek(panel)).first)
    .toBeGreaterThan(beforeWheel.first);
  await expect
    .poll(async () => topRowOffset(panel.locator(".week-scroll")))
    .toBeLessThan(1);
  for (let i = 0; i < 3; i++) await expectOneWeekMove(panel, 1);
  for (let i = 0; i < 3; i++) await expectOneWeekMove(panel, -1);
});

test("week buttons advance from either edge of a full-month view", async ({
  page,
}) => {
  await page.goto("/single");
  const panel = page.getByTestId("date");
  await panel.getByText("Configure this example").click();
  for (const [value, direction] of [
    ["2099-12-01T00:00:00.000Z", 1],
    ["2099-12-31T00:00:00.000Z", -1],
  ] as const) {
    await panel.getByLabel("Programmatic UTC value").fill(value);
    await panel.getByRole("button", { name: "Apply value" }).click();
    await expect(panel.getByTestId("value")).toHaveText(JSON.stringify(value));
    for (let i = 0; i < 3; i++) await expectOneWeekMove(panel, direction);
  }
});

test("mouse-wheel scrolling settles with a complete week at the top", async ({
  page,
}) => {
  await page.goto("/virtualization");
  const panel = page.getByTestId("virtual-weeks");
  const scroller = panel.locator(".week-scroll");
  const beforeWeek = await visibleWeek(panel);
  await scroller.hover();
  await page.mouse.wheel(0, 120);
  await expect
    .poll(async () => (await visibleWeek(panel)).first)
    .toBeGreaterThan(beforeWeek.first);
  await expect.poll(async () => topRowOffset(scroller)).toBeLessThan(1);
  const afterWeek = await visibleWeek(panel);
  expect(afterWeek.topDay - beforeWeek.topDay).toBe(
    7 * (afterWeek.first - beforeWeek.first),
  );
});

test("enlarged calendar rows also snap to a complete week", async ({
  page,
}) => {
  await page.goto("/styling");
  const panel = page.getByTestId("custom-style");
  const scroller = panel.locator(".week-scroll");
  const beforeWeek = await visibleWeek(panel);
  await scroller.hover();
  await page.mouse.wheel(0, 120);
  await expect
    .poll(async () => (await visibleWeek(panel)).first)
    .toBeGreaterThan(beforeWeek.first);
  await expect.poll(async () => topRowOffset(scroller)).toBeLessThan(1);
});

test("touch scrolling settles with a complete week at the top", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile");
  await page.goto("/virtualization");
  const panel = page.getByTestId("virtual-weeks");
  const scroller = panel.locator(".week-scroll");
  await scroller.scrollIntoViewIfNeeded();
  const box = (await scroller.boundingBox())!;
  const beforeWeek = await visibleWeek(panel);
  const session = await page.context().newCDPSession(page);
  const x = box.x + box.width / 2;
  const y = box.y + box.height * 0.8;
  try {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let i = 1; i <= 6; i++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y - i * 24 }],
      });
    }
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }
  await expect
    .poll(async () => (await visibleWeek(panel)).first)
    .toBeGreaterThan(beforeWeek.first);
  await expect.poll(async () => topRowOffset(scroller)).toBeLessThan(1);
  const afterWeek = await visibleWeek(panel);
  expect(afterWeek.topDay - beforeWeek.topDay).toBe(
    7 * (afterWeek.first - beforeWeek.first),
  );
});

test("wheel deltas leave three buffer rows above the first visible week", async ({
  page,
}) => {
  await page.goto("/virtualization");
  const panel = page.getByTestId("virtual-weeks");
  const scroller = panel.locator(".week-scroll");
  const initial = await visibleWeek(panel);
  await scroller.hover();
  for (const delta of [12, 26, 51, 80, 121, -13, -29, -53, -118, 37]) {
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(350);
    const state = await scroller.evaluate(
      (element: HTMLElement, bufferWeeks) => {
        const rows = Array.from(
          element.querySelectorAll<HTMLElement>(".week-row"),
        );
        const viewport = element.getBoundingClientRect();
        const firstVisible = rows[bufferWeeks];
        const annotation =
          firstVisible?.querySelector<HTMLElement>(".annotation");
        return {
          rowCount: rows.length,
          topOffset: firstVisible?.getBoundingClientRect().top - viewport.top,
          annotation: annotation?.textContent?.trim(),
          annotationBottom: annotation?.getBoundingClientRect().bottom,
          viewportTop: viewport.top,
        };
      },
      BUFFER_WEEKS,
    );
    expect(state.rowCount, `delta ${delta}`).toBe(10);
    expect(Math.abs(state.topOffset!), `delta ${delta}`).toBeLessThan(1);
    expect(state.annotation, `delta ${delta}`).not.toBe("");
    expect(state.annotationBottom!, `delta ${delta}`).toBeGreaterThan(
      state.viewportTop,
    );
    const reported = await visibleWeek(panel);
    expect(reported.topDay - initial.topDay, `delta ${delta}`).toBe(
      7 * (reported.first - initial.first),
    );
  }
});

test("scrollend navigates to the first absolute week already reported", async ({
  page,
}) => {
  await page.goto("/virtualization");
  const panel = page.getByTestId("virtual-weeks");
  const scroller = panel.locator(".week-scroll");
  const initial = await visibleWeek(panel);
  await scroller.hover();
  await page.mouse.wheel(0, 120);
  await expect
    .poll(async () => (await visibleWeek(panel)).first)
    .toBeGreaterThan(initial.first);
  const reported = await visibleWeek(panel);
  await scroller.dispatchEvent("scrollend");
  await expect
    .poll(async () => (await visibleWeek(panel)).first)
    .toBe(reported.first);
  await expect.poll(async () => topRowOffset(scroller)).toBeLessThan(1);
});
