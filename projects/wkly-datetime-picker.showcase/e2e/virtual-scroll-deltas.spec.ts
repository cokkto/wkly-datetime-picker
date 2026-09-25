import { test, expect } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

type VirtualWeeks = { first: number; days: number[] };

async function virtualWeeks(panel: Locator): Promise<VirtualWeeks> {
  const label = await panel.getByTestId("viewport").textContent();
  const match = label?.match(/Absolute weeks (-?\d+) …/);
  if (!match) throw new Error(`Unexpected viewport: ${label}`);
  const days = await panel
    .locator(".week-scroll")
    .evaluate((scroller: HTMLElement) =>
      Array.from(scroller.querySelectorAll<HTMLElement>(".week-row"), (row) => {
        const day = row
          .querySelector<HTMLElement>(".day")
          ?.getAttribute("data-day");
        if (!day) throw new Error("Week row has no first day");
        return Number(day);
      }),
    );
  return { first: Number(match[1]), days };
}

async function recordRenderedWeeks(panel: Locator): Promise<void> {
  await panel.locator(".rows").evaluate((rows: HTMLElement) => {
    const read = () =>
      Array.from(rows.querySelectorAll<HTMLElement>(".week-row"), (row) =>
        Number(
          row.querySelector<HTMLElement>(".day")?.getAttribute("data-day"),
        ),
      );
    const history = [read()];
    const observer = new MutationObserver(() => history.push(read()));
    observer.observe(rows, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    (window as any).__weekHistory = history;
    (window as any).__weekObserver = observer;
  });
}

async function renderedHistory(page: Page): Promise<number[][]> {
  return page.evaluate(() => {
    (window as any).__weekObserver.disconnect();
    return (window as any).__weekHistory as number[][];
  });
}

async function touchDrag(
  page: Page,
  scroller: Locator,
  distance: number,
): Promise<void> {
  await scroller.scrollIntoViewIfNeeded();
  const box = await scroller.boundingBox();
  if (!box) throw new Error("No calendar scroller");
  const session = await page.context().newCDPSession(page);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  try {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let step = 1; step <= 4; step++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y + (distance * step) / 4 }],
      });
      await page.waitForTimeout(50);
    }
    // Snap can run while the finger is still down.
    await page.waitForTimeout(300);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }
}

for (const mode of ["wheel", "touch"] as const) {
  for (const [size, distance, expected] of [
    ["small", 16, 0],
    ["medium", 60, 1],
    ["large", 180, 2],
  ] as const) {
    test(`${mode} ${size} deltas update the virtual weeks symmetrically`, async ({
      page,
    }, info) => {
      test.skip(
        info.project.name !== (mode === "touch" ? "mobile" : "chromium"),
      );
      const shifts: number[] = [];
      for (const direction of [-1, 1]) {
        await page.goto("/virtualization");
        const panel = page.getByTestId("virtual-weeks");
        const scroller = panel.locator(".week-scroll");
        await page.waitForTimeout(250);
        const before = await virtualWeeks(panel);
        await recordRenderedWeeks(panel);
        if (mode === "touch") {
          await touchDrag(page, scroller, direction * distance);
        } else {
          await scroller.hover();
          await page.mouse.wheel(0, -direction * distance);
        }
        await page.waitForTimeout(350);
        const after = await virtualWeeks(panel);
        const history = await renderedHistory(page);
        const shift = after.first - before.first;
        shifts.push(shift);
        if (expected === 0) {
          expect(shift, `${mode} ${size} ${direction}`).toBe(0);
          expect(
            history.every((set) => set.join() === before.days.join()),
          ).toBe(true);
        } else if (expected === 1) {
          expect(shift, `${mode} ${size} ${direction}`).toBe(-direction);
        } else {
          expect(Math.sign(shift), `${mode} ${size} ${direction}`).toBe(
            -direction,
          );
          expect(
            Math.abs(shift),
            `${mode} ${size} ${direction}`,
          ).toBeGreaterThanOrEqual(2);
        }
        for (const set of history.filter(
          (set) => set.length === before.days.length,
        )) {
          const intermediateShift = (set[0] - before.days[0]) / 7;
          expect(Number.isInteger(intermediateShift)).toBe(true);
          expect(set).toEqual(
            before.days.map((day) => day + 7 * intermediateShift),
          );
          expect(
            intermediateShift === 0 ||
              Math.sign(intermediateShift) === Math.sign(shift),
          ).toBe(true);
          expect(Math.abs(intermediateShift)).toBeLessThanOrEqual(
            Math.abs(shift),
          );
        }
        expect(after.days).toEqual(before.days.map((day) => day + 7 * shift));
      }
      expect(shifts[0] + shifts[1]).toBe(0);
    });
  }
}
