import { assert, test } from "../helpers/harness";
import {
  decodeIso,
  encodeIso,
  error,
  validateSelection,
  WklyGregorianCalendarAdapter,
} from "wkly-datetime-picker.adapters";
const adapter = new WklyGregorianCalendarAdapter("en-GB");
for (const mode of [
  "date",
  "time",
  "datetime",
  "date-range",
  "time-range",
  "datetime-range",
] as const) {
  const range = mode.endsWith("range");
  const iso = (hour: number) =>
    encodeIso(
      decodeIso(
        `2024-02-${hour === 10 ? "28" : hour === 12 ? "29" : "27"}T${hour}:00:00.000Z`,
      ),
      mode,
    );
  const low = iso(10),
    high = iso(12);
  const value = range ? ([low, high] as const) : low;
  const endpoints = range ? ["start", "end"] : ["single"];
  if (mode.startsWith("time"))
    test(`${mode}: requires year-zero time sentinel`, () => {
      const bad = low.replace("0000-01-01", "1970-01-01");
      assert.deepEqual(
        validateSelection(range ? [bad, bad] : bad, { mode }, adapter),
        endpoints.map((endpoint) =>
          error("malformed-iso", bad, "hidden-fields", endpoint as any),
        ),
      );
    });
  if (mode === "date" || mode === "date-range")
    test(`${mode}: nonzero hidden hours rejected`, () => {
      const bad = low.replace("T00:", "T12:");
      assert.deepEqual(
        validateSelection(range ? [bad, bad] : bad, { mode }, adapter),
        endpoints.map((endpoint) =>
          error("malformed-iso", bad, "hidden-fields", endpoint as any),
        ),
      );
    });
  test(`${mode}: inclusive equal bounds`, () =>
    assert.deepEqual(
      validateSelection(
        range ? [low, low] : low,
        { mode, min: low, max: low },
        adapter,
      ),
      [],
    ));
  for (const direction of ["min", "max"] as const)
    test(`${mode}: ${direction} rejects exact endpoints`, () => {
      const bound = direction === "min" ? high : low;
      const candidate = direction === "min" ? low : high;
      assert.deepEqual(
        validateSelection(
          range ? [candidate, candidate] : candidate,
          { mode, [direction]: bound },
          adapter,
        ),
        endpoints.map((endpoint) =>
          error(
            direction === "min" ? "below-minimum" : "above-maximum",
            candidate,
            undefined,
            endpoint as any,
          ),
        ),
      );
    });
  test(`${mode}: disabled endpoint errors`, () => {
    assert.deepEqual(
      validateSelection(
        value,
        { mode, allowRangeAcrossDisabled: true, isTimeDisabled: () => true },
        adapter,
      ),
      (range ? [low, high] : [low]).map((v, i) =>
        error("disabled-endpoint", v, "time", endpoints[i] as any),
      ),
    );
  });
  test(`${mode}: date predicate applicability`, () => {
    assert.deepEqual(
      validateSelection(
        value,
        {
          mode,
          allowRangeAcrossDisabled: true,
          isDateDisabled: () => true,
        },
        adapter,
      ),
      mode.startsWith("time")
        ? []
        : (range ? [low, high] : [low]).map((v, i) =>
            error("disabled-endpoint", v, "date", endpoints[i] as any),
          ),
    );
  });
  test(`${mode}: aligned steps accepted`, () => {
    assert.deepEqual(
      validateSelection(
        value,
        {
          mode,
          minuteStep: 15,
          secondStep: 30,
          showSeconds: true,
        },
        adapter,
      ),
      [],
    );
  });
  test(`${mode}: hidden fields rejected`, () => {
    const bad = low.replace("00.000Z", "01.000Z");
    assert.deepEqual(
      validateSelection(range ? [bad, bad] : bad, { mode }, adapter),
      endpoints.map((endpoint) =>
        error("malformed-iso", bad, "hidden-fields", endpoint as any),
      ),
    );
  });
  test(`${mode}: empty and required`, () => {
    assert.deepEqual(validateSelection(null, { mode }, adapter), []);
    assert.deepEqual(
      validateSelection(null, { mode, required: true }, adapter),
      [error("incomplete", null)],
    );
  });
  if (!mode.startsWith("date") || mode.startsWith("datetime"))
    test(`${mode}: minute and second step errors`, () => {
      for (const [suffix, config] of [
        ["01:00.000Z", { minuteStep: 5 }],
        ["00:01.000Z", { secondStep: 5, showSeconds: true }],
      ] as const) {
        const bad = low.slice(0, 14) + suffix;
        assert.deepEqual(
          validateSelection(
            range ? [bad, bad] : bad,
            { mode, ...config },
            adapter,
          ),
          endpoints.map((endpoint) =>
            error("step-mismatch", bad, "time", endpoint as any),
          ),
        );
      }
    });
  if (range)
    test(`${mode}: interior crossing allowed and rejected`, () => {
      const predicate =
        mode === "date-range"
          ? {
              isDateDisabled: (day: number) =>
                day === decodeIso(low).epochDay + 1,
            }
          : { isTimeDisabled: (seconds: number) => seconds === 11 * 3600 };
      const end = mode === "date-range" ? "2024-03-01T00:00:00.000Z" : high;
      const pair = [low, end] as const;
      assert.deepEqual(
        validateSelection(pair, { mode, ...predicate }, adapter),
        [error("range-crosses-disabled", pair)],
      );
      assert.deepEqual(
        validateSelection(
          pair,
          { mode, ...predicate, allowRangeAcrossDisabled: true },
          adapter,
        ),
        [],
      );
    });
}
