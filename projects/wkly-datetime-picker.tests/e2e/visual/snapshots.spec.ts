import { test, expect } from "../fixtures";
import { openPicker } from "../helpers/picker";
for (const [width, zoom] of [
  [360, 1],
  [768, 1.25],
  [1440, 0.8],
])
  test(`rendered weeks ${width} zoom ${zoom}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const { picker, panel } = await openPicker(page);
    await panel.scrollIntoViewIfNeeded();
    await picker.evaluate((element: HTMLElement, zoom) => {
      element.style.setProperty("zoom", String(zoom));
      element.style.setProperty("--wkly-size-multiplier", "1.15");
    }, zoom);
    await expect(picker).toHaveScreenshot(`weeks-${width}-${zoom}.png`, {
      animations: "disabled",
    });
  });
