import { test, expect, codes, emissions } from "../fixtures";
import type { WklyPickerValue } from "wkly-datetime-picker.adapters";

// Value permutations use one mounted picker; locale changes are public inputs,
// not new pages, contexts or application boots.
for (const mode of [
  "date",
  "datetime",
  "time",
  "date-range",
  "datetime-range",
  "time-range",
] as const) {
  test.describe(mode, () => {
    test.use({ suite: "values", spec: { inputs: { mode, locale: "en-GB" } } });
    test("UTC writes, inclusive bounds, validation and recovery", async ({
      host,
    }) => {
      const low = mode.startsWith("time")
        ? "0000-01-01T10:00:00.000Z"
        : mode.startsWith("datetime")
          ? "2024-03-10T10:00:00.000Z"
          : "2024-03-10T00:00:00.000Z";
      const high = mode.startsWith("time")
        ? "0000-01-01T12:00:00.000Z"
        : mode.startsWith("datetime")
          ? "2024-03-11T12:00:00.000Z"
          : "2024-03-11T00:00:00.000Z";
      const value = (iso: string): WklyPickerValue =>
        mode.endsWith("range") ? [iso, iso] : iso;
      const expected = (code: string) =>
        mode.endsWith("range") ? [code, code] : [code];
      for (const locale of ["en-GB", "ar"])
        await test.step(locale, async () => {
          await host.inputs({
            locale,
            min: low,
            max: low,
            minuteStep: 1,
            required: false,
          });
          let state = await host.write(value(low));
          expect(state.value).toEqual(value(low));
          expect(codes(state)).toEqual([]);
          expect(codes(await host.write(value(high)))).toEqual(
            expected("above-maximum"),
          );
          await host.inputs({ min: high, max: high });
          expect(codes(await host.write(value(low)))).toEqual(
            expected("below-minimum"),
          );
          await host.inputs({ min: null, max: null });
          if (mode.startsWith("time") || mode.startsWith("datetime")) {
            await host.inputs({ minuteStep: 15 });
            expect(
              codes(
                await host.write(
                  value(low.replace(":00:00.000Z", ":01:00.000Z")),
                ),
              ),
            ).toEqual(expected("step-mismatch"));
            expect(
              codes(
                await host.write(
                  value(low.replace(":00:00.000Z", ":15:00.000Z")),
                ),
              ),
            ).toEqual([]);
          }
          expect(
            codes(await host.write(value(low.replace("00.000Z", "01.000Z")))),
          ).toEqual(expected("malformed-iso"));
          const wrongShape: WklyPickerValue = mode.endsWith("range")
            ? low
            : [low, high];
          expect(codes(await host.write(wrongShape))).toEqual([
            "wrong-value-shape",
          ]);
          await host.inputs({ required: true });
          expect(codes(await host.write(null))).toEqual(["incomplete"]);
          state = await host.write(value(low));
          expect(state.value).toEqual(value(low));
          expect(codes(state)).toEqual([]);
          expect(state.formErrors).toBeNull();
          expect(state.status).toBe("VALID");
          expect(emissions(state)).toEqual([]);
          expect(state.dirty).toBe(false);
          expect(state.touched).toBe(false);
        });
    });
  });
}

test.describe("value boundaries", () => {
  test.use({
    suite: "values",
    spec: { inputs: { mode: "date", locale: "en-GB" } },
  });
  test("Gregorian extremes remain exact in a non-UTC context", async ({
    host,
  }) => {
    expect(
      await host.page.evaluate(
        () => Intl.DateTimeFormat().resolvedOptions().timeZone,
      ),
    ).toBe("America/New_York");
    for (const locale of ["en-GB", "ar"]) {
      await host.inputs({ locale });
      for (const iso of [
        "0000-01-01T00:00:00.000Z",
        "9999-12-31T00:00:00.000Z",
      ]) {
        const state = await host.write(iso);
        expect(state.value).toBe(iso);
        expect(codes(state)).toEqual([]);
        expect(emissions(state)).toEqual([]);
        await expect(host.picker.locator("button.day.selected")).toHaveCount(1);
      }
    }
  });
});
test.describe("disabled ranges", () => {
  test.use({
    suite: "values",
    spec: {
      inputs: { mode: "date-range", locale: "en-GB" },
      disabledEpochDays: [Date.UTC(2099, 11, 20) / 86400000],
    },
  });
  test("disabled endpoints and interior crossings have distinct errors", async ({
    host,
  }) => {
    for (const locale of ["en-GB", "ar"]) {
      await host.inputs({ locale, allowRangeAcrossDisabled: false });
      const pair: WklyPickerValue = [
        "2099-12-19T00:00:00.000Z",
        "2099-12-21T00:00:00.000Z",
      ];
      let state = await host.write(pair);
      expect(state.value).toEqual(pair);
      expect(codes(state)).toEqual(["range-crosses-disabled"]);
      expect(
        codes(await host.inputs({ allowRangeAcrossDisabled: true })),
      ).toEqual([]);
      state = await host.write([
        "2099-12-20T00:00:00.000Z",
        "2099-12-21T00:00:00.000Z",
      ]);
      expect(codes(state)).toEqual(["disabled-endpoint"]);
      expect(emissions(state)).toEqual([]);
      expect(codes(await host.write(null))).toEqual([]);
    }
  });
});

for (const [mode, expected] of [
  ["date", "2099-12-16T00:00:00.000Z"],
  ["datetime", "2099-12-16T13:00:00.000Z"],
  ["time", "0000-01-01T13:00:00.000Z"],
] as const) {
  test.describe(`${mode} form`, () => {
    test.use({
      suite: "forms",
      spec: {
        inputs: { mode, locale: "en-GB" },
        clock: "2099-12-16T13:00:00.000Z",
      },
    });
    test("Now normalizes, emits once, and programmatic clear is silent", async ({
      host,
    }) => {
      const now = host.picker.getByRole("button", { name: "Now", exact: true });
      await now.click();
      await now.click();
      let state = await host.snapshot();
      expect(state.value).toBe(expected);
      expect(emissions(state)).toEqual([expected]);
      expect(state.dirty).toBe(true);
      expect(state.touched).toBe(true);
      expect(state.status).toBe("VALID");
      await expect(
        host.picker.getByRole("button", { name: "Confirm", exact: true }),
      ).toHaveCount(0);
      state = await host.write(null);
      expect(state.value).toBeNull();
      expect(emissions(state)).toEqual([expected]);
      expect(codes(state)).toEqual([]);
    });
  });
}

test.describe("reactive forms", () => {
  test.use({
    suite: "forms",
    spec: {
      inputs: {
        mode: "datetime",
        locale: "en-GB",
        required: true,
        min: "2099-12-01T00:00:00.000Z",
      },
    },
  });
  test("validation propagates to the form; user commits touch it; disabled controls recover", async ({
    host,
  }) => {
    let state = await host.snapshot();
    expect(codes(state)).toEqual(["incomplete"]);
    expect(state.status).toBe("INVALID");
    expect(codes(await host.write("2099-12-16T13:00:00+03:00"))).toEqual([
      "malformed-iso",
    ]);
    state = await host.write("2099-11-01T13:00:00.000Z");
    expect(codes(state)).toEqual(["below-minimum"]);
    expect(state.formErrors?.wkly?.map((error) => error.code)).toEqual([
      "below-minimum",
    ]);
    expect(state.touched).toBe(false);
    expect(emissions(state)).toEqual([]);
    const now = host.picker.getByRole("button", { name: "Now", exact: true });
    await now.click();
    state = await host.snapshot();
    expect(state.status).toBe("VALID");
    expect(state.touched).toBe(true);
    const hour = host.picker.getByRole("textbox", {
      name: "Hour",
      exact: true,
    });
    state = await host.disable(true);
    expect(state.status).toBe("DISABLED");
    await expect(now).toBeDisabled();
    await expect(hour).toBeDisabled();
    const value = state.value;
    state = await host.disable(false);
    expect(state.value).toEqual(value);
    expect(state.status).toBe("VALID");
    await expect(hour).toBeEnabled();
    await hour.focus();
    await expect(hour).toBeFocused();
  });
  test("runtime step and bounds updates revalidate without duplicate outputs", async ({
    host,
  }) => {
    await host.write("2099-12-16T13:01:00.000Z");
    let state = await host.inputs({ minuteStep: 15 });
    expect(codes(state)).toEqual(["step-mismatch"]);
    expect(state.status).toBe("INVALID");
    expect(emissions(state)).toEqual([]);
    const minute = host.picker.getByRole("textbox", {
      name: "Minute",
      exact: true,
    });
    await minute.fill("15");
    await minute.press("Enter");
    state = await host.snapshot();
    expect(state.value).toBe("2099-12-16T13:15:00.000Z");
    expect(codes(state)).toEqual([]);
    state = await host.inputs({ min: "2100-01-01T00:00:00.000Z" });
    expect(codes(state)).toEqual(["below-minimum"]);
    state = await host.inputs({ min: null, locale: "ar" });
    expect(codes(state)).toEqual([]);
    expect(state.value).toBe("2099-12-16T13:15:00.000Z");
    expect(emissions(state)).toEqual([state.value]);
  });
});
test.describe("write channels", () => {
  test.use({
    suite: "forms",
    spec: {
      inputs: { mode: "date", locale: "en-GB" },
      value: "2099-12-16T00:00:00.000Z",
    },
  });
  test("direct CVA writes update the view without writing back to the form", async ({
    host,
  }) => {
    const state = await host.write("2099-12-17T00:00:00.000Z", "cva");
    expect(state.value).toBe("2099-12-16T00:00:00.000Z");
    expect(emissions(state)).toEqual([]);
    await expect(host.picker.locator("button.day.selected")).toHaveAttribute(
      "data-day",
      String(Date.UTC(2099, 11, 17) / 86400000),
    );
    await host.write("2099-12-18T00:00:00.000Z");
    await expect(host.picker.locator("button.day.selected")).toHaveAttribute(
      "data-day",
      String(Date.UTC(2099, 11, 18) / 86400000),
    );
  });
});
test.describe("input binding", () => {
  test.use({
    suite: "forms",
    spec: { binding: "input", inputs: { mode: "date", locale: "en-GB" } },
  });
  test("value and required inputs work without a form directive", async ({
    host,
  }) => {
    expect(codes(await host.inputs({ required: true }))).toEqual([
      "incomplete",
    ]);
    let state = await host.inputs({ value: "2099-12-16T00:00:00.000Z" });
    expect(codes(state)).toEqual([]);
    await expect(host.picker.locator("button.day.selected")).toHaveAttribute(
      "data-day",
      String(Date.UTC(2099, 11, 16) / 86400000),
    );
    state = await host.inputs({ value: null });
    expect(codes(state)).toEqual(["incomplete"]);
    expect(emissions(state)).toEqual([]);
  });
});
