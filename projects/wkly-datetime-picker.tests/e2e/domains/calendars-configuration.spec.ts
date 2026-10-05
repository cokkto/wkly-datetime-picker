import { test, expect, codes, emissions, PickerFixture } from "../fixtures";
import type { FixtureSpec } from "../../host/protocol";

const initial = "2024-03-11T13:00:00.000Z";
const day = (host: PickerFixture, epoch: number) =>
  host.picker.locator(`button.day[data-day="${epoch}"]`);
async function valueIs(host: PickerFixture, value: unknown) {
  await expect.poll(async () => (await host.snapshot()).value).toEqual(value);
}
async function edit(host: PickerFixture, name: string, value: string) {
  const field = host.picker.getByRole("textbox", { name, exact: true });
  await field.fill(value);
  await field.press("Enter");
}

for (const calendar of ["hebrew", "hijri"] as const) {
  test.describe(calendar, () => {
    test.use({
      suite: "calendars",
      spec: {
        calendar,
        inputs: {
          mode: "datetime",
          locale: "en-GB",
          weekOffset: 3,
          viewportPreset: { kind: "weeks", visibleWeekCount: 4 },
        },
        value: initial,
      },
    });
    test("calendar selection and localized manual drafts preserve canonical UTC values", async ({
      host,
    }) => {
      await expect(day(host, 19793)).toHaveClass(/selected/);
      await host.picker
        .getByRole("button", { name: "Next week", exact: true })
        .click();
      await host.picker
        .getByRole("button", { name: "Previous week", exact: true })
        .click();
      await valueIs(host, initial);
      await day(host, 19794).click();
      await valueIs(host, "2024-03-12T13:00:00.000Z");
      await edit(host, "Minute", "١٥");
      await valueIs(host, "2024-03-12T13:15:00.000Z");
      await host.write("2024-03-11T13:15:00.000Z");
      await host.picker
        .getByRole("button", { name: "Manual date entry", exact: true })
        .click();
      await edit(host, "Day", "٣١");
      await expect(
        host.picker.getByRole("textbox", { name: "Day", exact: true }),
      ).toHaveValue("31");
      expect(codes(await host.snapshot())).toEqual(["invalid-calendar-date"]);
      await valueIs(host, "2024-03-11T13:15:00.000Z");
      await edit(host, "Day", "١٥");
      await valueIs(host, "2024-03-25T13:15:00.000Z");
      expect(codes(await host.snapshot())).toEqual([]);
      expect(emissions(await host.snapshot())).toEqual([
        "2024-03-12T13:00:00.000Z",
        "2024-03-12T13:15:00.000Z",
        "2024-03-25T13:15:00.000Z",
      ]);
    });
    test("reversed ranges keep independent endpoint times", async ({
      host,
    }) => {
      await host.inputs({ mode: "datetime-range" });
      await host.write(null);
      await host.page.evaluate(() =>
        window.wklyTestHost.jump({ method: "epoch", value: 19793 }),
      );
      await day(host, 19795).click();
      await day(host, 19793).click();
      await valueIs(host, [
        "2024-03-11T00:00:00.000Z",
        "2024-03-13T00:00:00.000Z",
      ]);
      const minutes = host.picker.getByRole("textbox", {
        name: "Minute",
        exact: true,
      });
      for (const [index, value] of ["١٥", "٣٠"].entries()) {
        await minutes.nth(index).fill(value);
        await minutes.nth(index).press("Enter");
      }
      await valueIs(host, [
        "2024-03-11T00:15:00.000Z",
        "2024-03-13T00:30:00.000Z",
      ]);
      for (const epoch of [19793, 19795])
        await expect(day(host, epoch).locator("..")).toHaveAttribute(
          "aria-selected",
          "true",
        );
      expect(codes(await host.snapshot())).toEqual([]);
    });
    test("adapter bounds reject unsupported values and all public jumps focus supported edges", async ({
      host,
    }) => {
      const min = Date.UTC(1900, 0, 1) / 86400000;
      const max = Date.UTC(2100, 11, 31) / 86400000;
      for (const epoch of [min, max]) {
        const iso = new Date(epoch * 86400000).toISOString();
        expect(codes(await host.write(iso))).toEqual([]);
        await expect(day(host, epoch)).toHaveClass(/selected/);
      }
      for (const iso of [
        "1899-12-31T00:00:00.000Z",
        "2101-01-01T00:00:00.000Z",
      ])
        expect(codes(await host.write(iso))).toEqual([
          "unsupported-adapter-date",
        ]);
      await host.write(initial);
      for (const epoch of [-16, min, max]) {
        for (const method of ["epoch", "week", "calendar", "value"] as const) {
          const expected =
            method === "week"
              ? Math.max(min, Math.floor((epoch - 3) / 7) * 7 + 3)
              : epoch;
          const stops = await host.page.evaluate(
            async ({ method, epoch }) => {
              const host = window.wklyTestHost;
              const options = { focus: true };
              if (method === "calendar")
                return host.jump({
                  method,
                  value: host.calendarDate(epoch),
                  options,
                });
              if (method === "value")
                return host.jump({
                  method,
                  value: new Date(epoch * 86400000).toISOString(),
                  options,
                });
              return host.jump({
                method,
                value: method === "week" ? Math.floor((epoch - 3) / 7) : epoch,
                options,
              });
            },
            { method, epoch },
          );
          expect(stops).toEqual([expected]);
          await expect(day(host, expected)).toBeFocused();
          await expect(host.picker.locator(".week-row")).toHaveCount(10);
        }
      }
      await expect(
        host.picker.getByRole("button", { name: "Next week", exact: true }),
      ).toBeDisabled();
      await host.inputs({ min: "2024-03-12T00:00:00.000Z" });
      expect(codes(await host.snapshot())).toEqual(["below-minimum"]);
      expect(emissions(await host.snapshot())).toEqual([]);
    });
    if (calendar === "hebrew")
      test("Hebrew scrolling clamps both adapter limits with three blank overscan weeks", async ({
        host,
      }) => {
        for (const [edge, direction, name] of [
          [Date.UTC(1900, 0, 1) / 86400000, -1, "Previous week"],
          [Date.UTC(2100, 11, 31) / 86400000, 1, "Next week"],
        ] as const) {
          await host.page.evaluate(
            (value) => window.wklyTestHost.jump({ method: "epoch", value }),
            edge - direction * 35,
          );
          await host.picker
            .locator(".week-scroll")
            .evaluate((scroll, direction) => {
              scroll.scrollTop += direction * 100000;
              scroll.dispatchEvent(new Event("scroll"));
            }, direction);
          await expect(async () => {
            expect(
              await host.picker
                .getByRole("button", { name, exact: true })
                .isDisabled(),
              `${name} at epoch day ${edge}`,
            ).toBe(true);
            const geometry = await host.picker
              .locator(".week-scroll")
              .evaluate((scroll) => {
                const rows = Array.from(scroll.querySelectorAll(".week-row"));
                return {
                  count: rows.length,
                  visibleHaveDates: rows
                    .slice(3, -3)
                    .every((row) =>
                      Array.from(row.querySelectorAll(".day")).some(
                        (day) => !!day.textContent?.trim(),
                      ),
                    ),
                  leading: rows
                    .slice(0, 3)
                    .map((row) => row.textContent?.trim()),
                  trailing: rows
                    .slice(-3)
                    .map((row) => row.textContent?.trim()),
                  offset:
                    rows[3].getBoundingClientRect().top -
                    scroll.getBoundingClientRect().top,
                };
              });
            expect(geometry.count).toBe(10);
            expect(geometry.visibleHaveDates).toBe(true);
            expect(
              direction === -1 ? geometry.leading : geometry.trailing,
            ).toEqual(["", "", ""]);
            expect(Math.abs(geometry.offset)).toBeLessThan(1);
          }).toPass({ timeout: 5000 });
          expect((await host.snapshot()).value).toBe(initial);
          expect(emissions(await host.snapshot())).toEqual([]);
        }
      });
  });
}

test.describe("Arabic", () => {
  const translations = {
    ar: {
      manual: "إدخال التاريخ يدويًا",
      day: "اليوم",
      month: "الشهر",
      minute: "الدقيقة",
      next: "الأسبوع التالي",
      previous: "الأسبوع السابق",
    },
  };
  test.use({
    suite: "localization",
    spec: {
      inputs: { mode: "datetime", locale: "ar", translations },
      value: "2100-01-31T13:00:00.000Z",
    },
  });
  test("RTL keyboard chronology and Arabic digits edit values without changing UTC semantics", async ({
    host,
  }) => {
    await expect(host.picker.locator("section.wkly")).toHaveAttribute(
      "dir",
      "rtl",
    );
    const epoch = Date.UTC(2100, 0, 31) / 86400000;
    await expect(day(host, epoch)).toHaveAttribute(
      "aria-label",
      /[\u0600-\u06ff]/,
    );
    await day(host, epoch).focus();
    await host.page.keyboard.press("ArrowRight");
    await expect(day(host, epoch + 1)).toBeFocused();
    await host.page.keyboard.press("Enter");
    await edit(host, "الدقيقة", "١٥");
    await valueIs(host, "2100-02-01T13:15:00.000Z");
    await host.inputs({ locale: "en-GB" });
    await expect(host.picker.locator("section.wkly")).toHaveAttribute(
      "dir",
      "ltr",
    );
    await expect(
      host.picker.getByRole("textbox", { name: "Minute", exact: true }),
    ).toHaveValue("15");
    await valueIs(host, "2100-02-01T13:15:00.000Z");
  });
  test("invalid Arabic manual date retains its draft and recovers", async ({
    host,
  }) => {
    await host.picker
      .getByRole("button", { name: "إدخال التاريخ يدويًا", exact: true })
      .click();
    await edit(host, "الشهر", "٢");
    expect(codes(await host.snapshot())).toEqual(["invalid-calendar-date"]);
    await valueIs(host, "2100-01-31T13:00:00.000Z");
    await edit(host, "اليوم", "٢٨");
    await valueIs(host, "2100-02-28T13:00:00.000Z");
    expect(codes(await host.snapshot())).toEqual([]);
  });
});

test.describe("application configuration", () => {
  test.use({
    suite: "configuration",
    spec: {
      config: { locale: "en-GB", weekOffset: 3, initialEpochDay: -20 },
      inputs: { mode: "date" },
    },
  });
  test("explicit locale and week start override providers and clearing inputs restores them", async ({
    host,
  }) => {
    const header = host.picker
      .locator(".week-head [role='columnheader']")
      .nth(1);
    await expect(header).toHaveText("Sun");
    await host.inputs({ locale: "ar", weekOffset: 4 });
    await expect(host.picker.locator("section.wkly")).toHaveAttribute(
      "dir",
      "rtl",
    );
    await host.inputs({ locale: "en-GB", weekOffset: 4 });
    await expect(header).toHaveText("Mon");
    await host.inputs({ locale: "", weekOffset: null });
    await expect(header).toHaveText("Sun");
    expect(emissions(await host.snapshot())).toEqual([]);
  });
});
for (const [name, spec, epoch] of [
  ["clock", {}, 47466],
  ["configuration", { config: { initialEpochDay: -20 } }, -20],
  [
    "explicit input",
    { config: { initialEpochDay: -20 }, inputs: { initialEpochDay: -16 } },
    -16,
  ],
  [
    "selection",
    {
      config: { initialEpochDay: -20 },
      inputs: { initialEpochDay: -16 },
      value: "2024-03-11T00:00:00.000Z",
    },
    19793,
  ],
] as [string, FixtureSpec, number][]) {
  test.describe(`anchor from ${name}`, () => {
    test.use({ suite: "configuration", spec });
    test("initial anchor precedence does not emit a value", async ({
      host,
    }) => {
      await expect(day(host, epoch)).toHaveAttribute("tabindex", "0");
      expect(emissions(await host.snapshot())).toEqual([]);
    });
  });
}

for (const presentation of ["inline", "native", "cdk", "material"] as const) {
  test.describe(`${presentation} catalogs`, () => {
    test.use({
      suite: "localization",
      spec: {
        presentation,
        config: { locale: "en-GB" },
        translations: {
          "EN-gb": { now: "Injected regional now" },
          en: { next: "Injected next" },
        },
        localization: { confirm: "Local confirm" },
        value: initial,
      },
    });
    test("scoped providers, regional fallback and input catalog replacement retain their precedence", async ({
      host,
    }) => {
      async function open() {
        if (presentation !== "inline")
          await host.page.getByTestId("trigger").click();
        await expect(host.picker).toBeVisible();
      }
      async function close() {
        if (presentation !== "inline")
          await host.page.evaluate(() => window.wklyTestHost.close());
      }
      async function labels(now: string, next: string) {
        await expect(
          host.picker.getByRole("button", { name: now, exact: true }),
        ).toBeVisible();
        await expect(
          host.picker.getByRole("button", { name: next, exact: true }),
        ).toBeVisible();
        if (presentation !== "inline")
          await expect(
            host.picker.getByRole("button", {
              name: "Local confirm",
              exact: true,
            }),
          ).toBeVisible();
      }
      await open();
      await labels("Injected regional now", "Injected next");
      await close();
      const translations = {
        "EN-gb": { now: "Regional now", confirm: "Ignored confirm" },
        en: { now: "Language now", next: "Language next" },
        "HE-il": { now: "Regional Hebrew now" },
        he: { next: "Hebrew next" },
      };
      for (const [locale, now, next] of [
        ["en-GB", "Regional now", "Language next"],
        ["en-US", "Language now", "Language next"],
        ["he-IL", "Regional Hebrew now", "Hebrew next"],
        ["he", "Now", "Hebrew next"],
        ["fi", "Now", "Next week"],
      ]) {
        await host.inputs({ locale, translations });
        await open();
        await labels(now, next);
        await close();
      }
      await host.inputs({ locale: "en-GB", translations: {} });
      await open();
      await labels("Now", "Next week");
      await close();
      await host.inputs({ translations: null });
      await open();
      await labels("Injected regional now", "Injected next");
      await close();
      await valueIs(host, initial);
      expect(emissions(await host.snapshot())).toEqual([]);
    });
  });
}

test.describe("linked calendars", () => {
  test.use({
    suite: "paired",
    spec: { pairedCalendars: true, value: "2024-03-25T00:00:00.000Z" },
  });
  test("Gregorian, Hebrew and Hijri share one UTC selection in every direction", async ({
    host,
  }) => {
    const pickers = host.page.locator("wkly-datetime-picker");
    await expect(pickers).toHaveCount(3);
    for (const [index, epoch] of [19808, 19809, 19810].entries()) {
      await pickers
        .nth(index)
        .locator(`button.day[data-day="${epoch}"]`)
        .click();
      await valueIs(host, new Date(epoch * 86400000).toISOString());
      for (let companion = 0; companion < 3; companion++)
        await expect(
          pickers.nth(companion).locator("button.day.selected"),
        ).toHaveAttribute("data-day", String(epoch));
    }
    expect(emissions(await host.snapshot())).toHaveLength(3);
  });
});
