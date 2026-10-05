import type { Locator } from "@playwright/test";
import { expect } from "./fixtures";

// Observe complete Angular renders throughout a gesture, not only its settled result.
export async function renderedWeekHistory(
  scroller: Locator,
  gesture: () => Promise<void>,
): Promise<number[][]> {
  const recorder = await scroller.locator(".rows").evaluateHandle((rows) => {
    const read = () =>
      Array.from(rows.querySelectorAll(".week-row"), (row) =>
        Number(row.querySelector<HTMLElement>(".day")!.dataset.day),
      );
    const history = [read()];
    const observer = new MutationObserver(() => history.push(read()));
    observer.observe(rows, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    return { history, observer };
  });
  try {
    await gesture();
    return await recorder.evaluate((record) => record.history);
  } finally {
    await recorder.evaluate((record) => record.observer.disconnect());
    await recorder.dispose();
  }
}

export function expectWeekHistory(
  history: number[][],
  before: number[],
  shift: number,
): void {
  expect(history.length).toBeGreaterThan(0);
  for (const days of history) {
    expect(days).toHaveLength(before.length);
    const intermediate = (days[0] - before[0]) / 7;
    expect(Number.isInteger(intermediate)).toBe(true);
    expect(days).toEqual(before.map((day) => day + intermediate * 7));
    expect(
      intermediate === 0 || Math.sign(intermediate) === Math.sign(shift),
    ).toBe(true);
    expect(Math.abs(intermediate)).toBeLessThanOrEqual(Math.abs(shift));
  }
  expect(history[history.length - 1]).toEqual(
    before.map((day) => day + shift * 7),
  );
}
