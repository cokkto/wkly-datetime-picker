import { test, expect } from "../fixtures";
import { openPicker } from "../helpers/picker";
for (const width of [360, 768, 1440])
  for (const zoom of [0.8, 1, 1.25, 1.5])
    test(`week geometry viewport ${width} CSS zoom ${zoom}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      const { picker, scroller, panel } = await openPicker(page);
      await picker.evaluate((element: HTMLElement, scale) => {
        element.style.setProperty("zoom", String(scale));
        element.style.setProperty("--wkly-size-multiplier", "1.15");
      }, zoom);
      for (const step of [0, 1]) {
        if (step)
          await picker
            .getByRole("button", { name: "Next week", exact: true })
            .click();
        await expect
          .poll(async () =>
            scroller.evaluate((element: HTMLElement) => {
              const viewport = element.getBoundingClientRect();
              const rows = Array.from(
                element.querySelectorAll<HTMLElement>(".week-row"),
              ).filter((row) => {
                const r = row.getBoundingClientRect();
                return r.top >= viewport.top && r.bottom <= viewport.bottom;
              });
              if (!rows.length) return ["no complete weeks"];
              return rows.flatMap((row) => {
                const days = Array.from(
                  row.querySelectorAll<HTMLElement>("button.day"),
                ).filter((day) => day.getBoundingClientRect().width > 0);
                const issues: string[] = [];
                if (days.length !== 7)
                  issues.push(`week has ${days.length} days`);
                for (const day of days) {
                  const r = day.getBoundingClientRect();
                  if (
                    r.left < viewport.left - 1 ||
                    r.right > viewport.right + 1
                  )
                    issues.push("day clipped horizontally");
                }
                for (let i = 1; i < days.length; i++) {
                  const a = days[i - 1].getBoundingClientRect(),
                    b = days[i].getBoundingClientRect();
                  if (
                    Math.abs(a.top - b.top) > 1 ||
                    Math.abs(a.width - b.width) > 1
                  )
                    issues.push("day alignment");
                }
                return issues;
              });
            }),
          )
          .toEqual([]);
      }
      await info.attach("week-layout", {
        body: await panel.screenshot(),
        contentType: "image/png",
      });
      const selected = await picker
        .locator(".day.selected")
        .getAttribute("data-day");
      await page.setViewportSize({
        width: width === 360 ? 1440 : 360,
        height: 844,
      });
      await expect(picker.locator(`.day[data-day='${selected}']`)).toHaveClass(
        /selected/,
      );
    });
