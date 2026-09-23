import { test, expect } from "./fixtures";
import type { Locator } from "@playwright/test";

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

test("week buttons show a new row on every repeated click", async ({
  page,
}) => {
  await page.goto("/virtualization");
  const panel = page.getByTestId("virtual-weeks");
  for (let i = 0; i < 4; i++) await expectOneWeekMove(panel, 1);
  for (let i = 0; i < 4; i++) await expectOneWeekMove(panel, -1);
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
