import { test, expect } from "../fixtures";
import { openPicker } from "../helpers/picker";
for (const zoom of [0.8, 1, 1.25, 1.5])
  test(`four complete weeks at fractional scale ${zoom}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const { picker, scroller } = await openPicker(page);
    await picker.evaluate((element: HTMLElement, zoom) => {
      element.style.setProperty("zoom", String(zoom));
      element.style.setProperty("--wkly-size-multiplier", "1.15");
    }, zoom);
    await expect
      .poll(() =>
        scroller.evaluate((element: HTMLElement) => {
          const view = element.getBoundingClientRect();
          return Array.from(
            element.querySelectorAll<HTMLElement>(".week-row"),
          ).filter((row) => {
            const r = row.getBoundingClientRect();
            return r.top >= view.top - 1 && r.bottom <= view.bottom + 1;
          }).length;
        }),
      )
      .toBe(4);
  });
for (const width of [360, 768, 1440])
  test(`month boundary annotations do not overlap at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const { picker, scroller } = await openPicker(page);
    await picker.evaluate((element: HTMLElement) =>
      element.style.setProperty("--wkly-size-multiplier", "1.15"),
    );
    await expect
      .poll(() =>
        scroller.evaluate((element: HTMLElement) => {
          const view = element.getBoundingClientRect();
          return Array.from(
            element.querySelectorAll<HTMLElement>(".week-row"),
          ).flatMap((row) => {
            const bounds = row.getBoundingClientRect();
            if (bounds.bottom < view.top || bounds.top > view.bottom) return [];
            const labels = Array.from(
              row.querySelectorAll<HTMLElement>(".annotation"),
            )
              .filter((label) => label.textContent!.trim())
              .map((label) => {
                const range = document.createRange();
                range.selectNodeContents(label);
                return range.getBoundingClientRect();
              })
              .sort((a, b) => a.left - b.left);
            return labels
              .slice(1)
              .filter((label, i) => label.left < labels[i].right - 1)
              .map(() => "overlapping month labels");
          });
        }),
      )
      .toEqual([]);
  });
