import { test, expect, codes, emissions, PickerFixture } from "../fixtures";
import { weekColumns } from "../week-columns";

const initial = "2099-12-16T13:00:00.000Z";
const trigger = (host: PickerFixture) => host.page.getByTestId("trigger");
const dialog = (host: PickerFixture) => host.page.getByRole("dialog");
async function initiallyFocused(host: PickerFixture) {
  const tabStop = host.picker.locator("button.day[tabindex='0']");
  if (await tabStop.count()) await expect(tabStop).toBeFocused();
  else
    await expect(
      host.picker
        .locator("button:not(:disabled), input:not(:disabled)")
        .first(),
    ).toBeFocused();
}
async function open(host: PickerFixture) {
  await trigger(host).click();
  await expect(dialog(host)).toBeVisible();
  await expect(host.picker).toHaveCount(1);
  await initiallyFocused(host);
}
async function minute(host: PickerFixture, value: string) {
  const input = dialog(host).getByRole("textbox", {
    name: "Minute",
    exact: true,
  });
  await input.fill(value);
  await input.press("Enter");
}
async function closed(host: PickerFixture, reason: string) {
  await expect(dialog(host)).toHaveCount(0);
  await expect(trigger(host)).toBeFocused();
  const events = (await host.snapshot()).events.filter(
    (event) => event.name === "closed",
  );
  expect(events[events.length - 1].value).toBe(reason);
  await expect(
    host.page.locator(
      ".cdk-overlay-pane, .cdk-overlay-backdrop, .cdk-focus-trap-anchor",
    ),
  ).toHaveCount(0);
  await expect(host.page.locator("html")).not.toHaveClass(
    /cdk-global-scrollblock/,
  );
}

for (const presentation of ["native", "cdk", "material"] as const) {
  test.describe(presentation, () => {
    test.use({
      suite: presentation,
      spec: {
        presentation,
        inputs: { mode: "datetime", locale: "en-GB" },
        value: initial,
      },
    });

    test("empty manual ranges initialize a complete draft; cancellation discards it and Confirm submits it", async ({
      host,
    }) => {
      for (const mode of ["date-range", "datetime-range"] as const) {
        await host.inputs({ mode });
        await host.write(null);
        const before = emissions(await host.snapshot()).length;
        await open(host);
        await dialog(host)
          .getByRole("button", { name: "Manual date entry" })
          .click();
        const confirm = dialog(host).getByRole("button", {
          name: "Confirm",
          exact: true,
        });
        await expect(confirm).toBeEnabled();
        expect((await host.snapshot()).value).toBeNull();
        expect(emissions(await host.snapshot())).toHaveLength(before);
        const end = dialog(host).getByRole("group", {
          name: "End",
          exact: true,
        });
        await end
          .getByRole("button", { name: "In 0 days", exact: true })
          .click();
        const days = end.getByRole("textbox", { name: "Days", exact: true });
        await days.fill("2");
        await days.press("Enter");
        await expect(confirm).toBeEnabled();
        await dialog(host)
          .getByRole("button", { name: "Close picker", exact: true })
          .click();
        await closed(host, "close-button");
        expect((await host.snapshot()).value).toBeNull();
        expect(emissions(await host.snapshot())).toHaveLength(before);
        await open(host);
        await dialog(host)
          .getByRole("button", { name: "Manual date entry" })
          .click();
        await confirm.click();
        await closed(host, "submit");
        const value =
          mode === "date-range" ? "2099-12-16T00:00:00.000Z" : initial;
        expect((await host.snapshot()).value).toEqual([value, value]);
        expect(emissions(await host.snapshot()).slice(before)).toEqual([
          [value, value],
        ]);
      }
    });

    test("confirm commits once; cancellation and reopen restore the last committed value", async ({
      host,
    }) => {
      await expect(trigger(host)).toHaveValue(initial);
      await expect(trigger(host)).toHaveJSProperty("readOnly", true);
      await expect(trigger(host)).toHaveAttribute("aria-haspopup", "dialog");
      await open(host);
      await minute(host, "15");
      expect((await host.snapshot()).value).toBe(initial);
      expect(emissions(await host.snapshot())).toEqual([]);
      await dialog(host)
        .getByRole("button", { name: "Confirm", exact: true })
        .click();
      await closed(host, "submit");
      const committed = "2099-12-16T13:15:00.000Z";
      await expect(trigger(host)).toHaveValue(committed);
      expect((await host.snapshot()).value).toBe(committed);
      expect((await host.snapshot()).touched).toBe(true);
      await open(host);
      await minute(host, "20");
      await dialog(host)
        .getByRole("button", { name: "Close picker", exact: true })
        .click();
      await closed(host, "close-button");
      await open(host);
      await expect(
        dialog(host).getByRole("textbox", { name: "Minute", exact: true }),
      ).toHaveValue("15");
      await dialog(host)
        .getByRole("button", { name: "Confirm", exact: true })
        .click();
      await closed(host, "submit");
      expect(emissions(await host.snapshot())).toEqual([committed]);
    });

    test("field Escape restores its draft, Tab stays inside, dialog Escape rolls back", async ({
      host,
    }) => {
      await trigger(host).focus();
      await trigger(host).press("ArrowDown");
      await expect(dialog(host)).toBeVisible();
      await initiallyFocused(host);
      const input = dialog(host).getByRole("textbox", {
        name: "Minute",
        exact: true,
      });
      await input.fill("99");
      await input.press("Escape");
      await expect(dialog(host)).toBeVisible();
      await expect(input).toHaveValue("00");
      await minute(host, "25");
      const confirm = dialog(host).getByRole("button", {
        name: "Confirm",
        exact: true,
      });
      await confirm.focus();
      await host.page.keyboard.press("Tab");
      await expect
        .poll(() =>
          dialog(host).evaluate((element) =>
            element.contains(document.activeElement),
          ),
        )
        .toBe(true);
      await host.page.keyboard.press("Shift+Tab");
      await expect(confirm).toBeFocused();
      await host.page.keyboard.press("Escape");
      await closed(host, "escape");
      expect((await host.snapshot()).value).toBe(initial);
      expect(emissions(await host.snapshot())).toEqual([]);
    });

    test("backdrop policy discards edits only when enabled", async ({
      host,
    }) => {
      for (const closeOnBackdrop of [false, true]) {
        await host.inputs({ closeOnBackdrop });
        await open(host);
        await minute(host, "35");
        if (presentation === "native") await host.page.mouse.click(1, 1);
        else
          await host.page
            .locator(".cdk-overlay-backdrop")
            .click({ position: { x: 1, y: 1 } });
        if (!closeOnBackdrop) {
          await expect(dialog(host)).toBeVisible();
          await host.page.evaluate(() => window.wklyTestHost.close());
        }
        await closed(host, closeOnBackdrop ? "backdrop" : "programmatic");
        expect((await host.snapshot()).value).toBe(initial);
        expect(emissions(await host.snapshot())).toEqual([]);
      }
    });

    test("date calendar auto-submits but manual date entry requires Confirm", async ({
      host,
    }) => {
      await host.inputs({ mode: "date" });
      await host.write("2099-12-16T00:00:00.000Z");
      await open(host);
      await expect(
        dialog(host).getByRole("button", { name: "Confirm", exact: true }),
      ).toHaveCount(0);
      await dialog(host)
        .getByRole("button", {
          name: "Thursday, 17 December 2099",
          exact: true,
        })
        .click();
      await closed(host, "auto-submit");
      await open(host);
      await dialog(host)
        .getByRole("button", { name: "Manual date entry", exact: true })
        .click();
      const day = dialog(host).getByRole("textbox", {
        name: "Day",
        exact: true,
      });
      await day.fill("18");
      await day.press("Enter");
      await expect(dialog(host)).toBeVisible();
      expect((await host.snapshot()).value).toBe("2099-12-17T00:00:00.000Z");
      await dialog(host)
        .getByRole("button", { name: "Confirm", exact: true })
        .click();
      await closed(host, "submit");
      expect(emissions(await host.snapshot())).toEqual([
        "2099-12-17T00:00:00.000Z",
        "2099-12-18T00:00:00.000Z",
      ]);
    });

    test("empty modes disable Confirm; Now submits normalized values; confirming unchanged values is silent", async ({
      host,
    }) => {
      for (const mode of [
        "datetime",
        "time",
        "date-range",
        "datetime-range",
        "time-range",
      ] as const) {
        await host.inputs({ mode });
        await host.write(null);
        const before = emissions(await host.snapshot()).length;
        await open(host);
        await expect(
          dialog(host).getByRole("button", { name: "Confirm", exact: true }),
        ).toBeDisabled();
        await dialog(host)
          .getByRole("button", { name: "Now", exact: true })
          .click();
        await closed(host, "now");
        const iso = mode.startsWith("time")
          ? "0000-01-01T13:00:00.000Z"
          : mode === "date-range"
            ? "2099-12-16T00:00:00.000Z"
            : initial;
        const expected = mode.endsWith("range") ? [iso, iso] : iso;
        expect((await host.snapshot()).value).toEqual(expected);
        expect(emissions(await host.snapshot()).slice(before)).toEqual([
          expected,
        ]);
        await open(host);
        await dialog(host)
          .getByRole("button", { name: "Confirm", exact: true })
          .click();
        await closed(host, "submit");
        expect(emissions(await host.snapshot())).toHaveLength(before + 1);
      }
    });

    test("disabled triggers cannot open; writes update an open picker without emitting", async ({
      host,
    }) => {
      await host.disable(true);
      await expect(trigger(host)).toBeDisabled();
      await trigger(host).evaluate((element: HTMLInputElement) =>
        element.click(),
      );
      await expect(dialog(host)).toHaveCount(0);
      await host.disable(false);
      await open(host);
      await host.write("2099-12-16T14:45:00.000Z");
      await expect(
        dialog(host).getByRole("textbox", { name: "Hour", exact: true }),
      ).toHaveValue("14");
      await expect(
        dialog(host).getByRole("textbox", { name: "Minute", exact: true }),
      ).toHaveValue("45");
      await host.page.evaluate(() => window.wklyTestHost.close());
      await closed(host, "programmatic");
      await expect(trigger(host)).toHaveValue("2099-12-16T14:45:00.000Z");
      expect(emissions(await host.snapshot())).toEqual([]);
    });

    test("week-number input changes update columns live and survive closing and reopening", async ({
      host,
    }) => {
      await host.inputs({
        weekOffset: 3,
        viewportPreset: { kind: "weeks", visibleWeekCount: 4 },
      });
      await open(host);
      await weekColumns(host, true);
      await host.inputs({ weekLabelMode: "hidden" });
      await weekColumns(host, false);
      await host.page.evaluate(() => window.wklyTestHost.close());
      await closed(host, "programmatic");
      await open(host);
      await weekColumns(host, false);
      await host.page.evaluate(() => window.wklyTestHost.close());
      await closed(host, "programmatic");
      await host.inputs({ weekLabelMode: "locale" });
      await open(host);
      await weekColumns(host, true);
      await host.page.evaluate(() => window.wklyTestHost.close());
      await closed(host, "programmatic");
      expect((await host.snapshot()).value).toBe(initial);
      expect(emissions(await host.snapshot())).toEqual([]);
    });

    test("public jumps open the presentation; immediate close cancels deferred focus and reopening works", async ({
      host,
    }) => {
      const stops = await host.page.evaluate(() =>
        window.wklyTestHost.jump({
          method: "epoch",
          value: -16,
          options: { focus: true },
          closeAfter: true,
        }),
      );
      expect(stops).toEqual([-16]);
      await closed(host, "programmatic");
      await host.page.evaluate(() =>
        window.wklyTestHost.jump({
          method: "value",
          value: "1969-12-16T00:00:00.000Z",
          options: { focus: true },
        }),
      );
      await expect(
        host.picker.locator("button.day[data-day='-16']"),
      ).toBeFocused();
      await host.page.evaluate(() => window.wklyTestHost.close());
      await closed(host, "programmatic");
      expect((await host.snapshot()).value).toBe(initial);
      expect(emissions(await host.snapshot())).toEqual([]);
      expect(
        (await host.snapshot()).events.filter(
          (event) => event.name === "opened",
        ),
      ).toHaveLength(2);
    });

    test("destroying an open fixture removes presentation, focus traps and scroll lock", async ({
      host,
    }) => {
      await open(host);
      await minute(host, "40");
      await host.page.evaluate(() => window.wklyTestHost.destroy());
      await expect(dialog(host)).toHaveCount(0);
      await expect(
        host.page.locator(
          "test-fixture, wkly-datetime-picker, .cdk-overlay-pane, .cdk-overlay-backdrop, .cdk-focus-trap-anchor",
        ),
      ).toHaveCount(0);
      await expect(host.page.locator("html")).not.toHaveClass(
        /cdk-global-scrollblock/,
      );
      const identity = await host.page.evaluate(() =>
        window.wklyTestHost.identity(),
      );
      expect(identity.mounts).toBe(identity.destroys);
    });
  });
}

for (const presentation of ["native", "cdk"] as const) {
  for (const calendar of ["gregorian", "hebrew", "hijri"] as const) {
    test.describe(`${presentation} ${calendar} adapter jumps`, () => {
      test.use({
        suite: presentation,
        spec: {
          presentation,
          calendar,
          inputs: {
            mode: "datetime",
            locale: "en-GB",
            weekOffset: 3,
            viewportPreset: { kind: "weeks", visibleWeekCount: 4 },
          },
          value: "2024-03-11T13:00:00.000Z",
        },
      });
      test("all public jump methods open the trigger and focus pre-epoch and adapter boundaries", async ({
        host,
      }) => {
        const min =
          calendar === "gregorian" ? -719528 : Date.UTC(1900, 0, 1) / 86400000;
        const max =
          calendar === "gregorian"
            ? 2932896
            : Date.UTC(2100, 11, 31) / 86400000;
        for (const method of ["epoch", "week", "calendar", "value"] as const) {
          for (const epoch of [-16, min, max]) {
            const expected =
              method === "week"
                ? Math.max(min, Math.floor((epoch - 3) / 7) * 7 + 3)
                : epoch;
            const stops = await host.page.evaluate(
              ({ method, epoch }) => {
                const bridge = window.wklyTestHost;
                const options = { focus: true };
                if (method === "calendar")
                  return bridge.jump({
                    method,
                    value: bridge.calendarDate(epoch),
                    options,
                  });
                if (method === "value")
                  return bridge.jump({
                    method,
                    value: new Date(epoch * 86400000).toISOString(),
                    options,
                  });
                return bridge.jump({
                  method,
                  value:
                    method === "week" ? Math.floor((epoch - 3) / 7) : epoch,
                  options,
                });
              },
              { method, epoch },
            );
            expect(stops).toEqual([expected]);
            await expect(dialog(host)).toBeVisible();
            const day = host.picker.locator(
              `button.day[data-day="${expected}"]`,
            );
            await expect(day).toBeFocused();
            await expect
              .poll(() =>
                day.evaluate((button) => {
                  const bounds = button.getBoundingClientRect();
                  const view = button
                    .closest(".week-scroll")!
                    .getBoundingClientRect();
                  return (
                    bounds.width > 0 &&
                    bounds.top >= view.top - 1 &&
                    bounds.bottom <= view.bottom + 1
                  );
                }),
              )
              .toBe(true);
            await expect(host.picker.locator(".week-row")).toHaveCount(10);
            expect(codes(await host.snapshot())).toEqual([]);
            expect((await host.snapshot()).value).toBe(
              "2024-03-11T13:00:00.000Z",
            );
            expect(emissions(await host.snapshot())).toEqual([]);
          }
          await host.page.evaluate(() => window.wklyTestHost.close());
          await closed(host, "programmatic");
        }
      });
    });
  }
}
