import { test, expect } from "../fixtures";
import { openPicker } from "../helpers/picker";
import { SCREEN_TYPES_MAIN, SCREEN_SIZE } from "../helpers/constants";

for (const zoom of [0.8, 1, 1.25, 1.5])
  test(`four complete weeks at fractional scale ${zoom}`, async ({ page }) => {
    await page.setViewportSize({ width: SCREEN_SIZE.DESKTOP, height: 1000 });
    const { picker, scroller } = await openPicker(page);
    await picker.evaluate((element: HTMLElement, zoom) => {
      element.style.setProperty("zoom", String(zoom));
      element.style.setProperty("--wkly-size-multiplier", "1.15");
    }, zoom);
    for (const step of ["initial", "navigation", "scroll"]) {
      await test.step(`${step}: four complete weeks`, async () => {
        if (step === "navigation")
          await picker
            .getByRole("button", { name: "Next week", exact: true })
            .click();
        if (step === "scroll")
          await scroller.evaluate((element: HTMLElement) => {
            element.scrollTop += element.clientHeight * 0.35;
          });
        await expect
          .poll(() =>
            scroller.evaluate((element: HTMLElement) => {
              const view = element.getBoundingClientRect();
              const rows = Array.from(
                element.querySelectorAll<HTMLElement>(".week-row"),
                (row) => row.getBoundingClientRect(),
              );
              return {
                completeWeeks: rows.filter(
                  (r) => r.top >= view.top - 1 && r.bottom <= view.bottom + 1,
                ).length,
                heightFitsFourWeeks:
                  !!rows.length &&
                  Math.abs(view.height - 4 * rows[0].height) <= 1,
              };
            }),
          )
          .toEqual({ completeWeeks: 4, heightFitsFourWeeks: true });
      });
    }
  });
for (const width of SCREEN_TYPES_MAIN)
  test(`month boundary annotations remain staggered at ${width}`, async ({
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
              .filter((label, i) => {
                const previous = labels[i];
                // Horizontal overlap is intentional; labels must occupy different vertical tracks.
                return (
                  label.left < previous.right - 1 &&
                  Math.abs(label.top - previous.top) <
                    Math.min(label.height, previous.height) / 2
                );
              })
              .map(() => "month labels lack vertical staggering");
          });
        }),
      )
      .toEqual([]);
  });
