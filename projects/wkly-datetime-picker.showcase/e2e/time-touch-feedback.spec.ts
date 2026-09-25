import { test, expect } from "./fixtures";

for (const [name, direction] of [
  ["up", 1],
  ["down", -1],
] as const) {
  test(`time field updates during a ${name} touch drag`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "mobile");
    await page.goto("/single");
    const panel = page.getByTestId("datetime");
    const minute = panel.getByRole("textbox", { name: "Minute", exact: true });
    const before = Number(await minute.inputValue());
    const shown = (steps: number) =>
      String((before + direction * steps + 60) % 60).padStart(2, "0");
    await minute.scrollIntoViewIfNeeded();
    const box = await minute.boundingBox();
    if (!box) throw new Error("Minute field has no bounding box");
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const session = await page.context().newCDPSession(page);
    try {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      for (const [distance, expectedSteps] of [
        [8, 0],
        [25, 1],
        [60, 2],
        [25, 1],
      ] as const) {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: y - direction * distance }],
        });
        await expect(minute, `distance ${distance} while touching`).toHaveValue(
          shown(expectedSteps),
        );
      }
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } finally {
      await session.detach();
    }
    await expect(panel.getByTestId("value")).toContainText(
      `13:${shown(1)}:00.000Z`,
    );
  });
}
