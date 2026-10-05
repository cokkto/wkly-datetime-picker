import { strict as assert } from "node:assert";
import { test } from "./test";
import {
  error,
  validateSelection,
  WklyGregorianCalendarAdapter,
} from "wkly-datetime-picker.adapters";
const adapter = new WklyGregorianCalendarAdapter();
const a = "2024-02-28T00:00:00.000Z",
  b = "2024-02-29T00:00:00.000Z";
test("disabled predicates receive endpoint, mode, calendar date and seconds", () => {
  const calls: unknown[] = [];
  assert.deepEqual(
    validateSelection(
      [a, b],
      {
        mode: "datetime-range",
        allowRangeAcrossDisabled: true,
        isDateDisabled: (day, context) => {
          calls.push([day, context]);
          return false;
        },
        isTimeDisabled: (seconds, context) => {
          calls.push([seconds, context]);
          return false;
        },
      },
      adapter,
    ),
    [],
  );
  const da = adapter.dateToEpochDay({
      calendarId: "gregory",
      year: 2024,
      month: 2,
      monthCode: "M02",
      day: 28,
    }),
    db = da + 1;
  assert.deepEqual(calls, [
    [
      da,
      {
        mode: "datetime-range",
        endpoint: "start",
        calendarDate: adapter.epochDayToDate(da),
      },
    ],
    [0, { mode: "datetime-range", endpoint: "start" }],
    [
      db,
      {
        mode: "datetime-range",
        endpoint: "end",
        calendarDate: adapter.epochDayToDate(db),
      },
    ],
    [0, { mode: "datetime-range", endpoint: "end" }],
  ]);
});
for (const mode of ["date-range", "datetime-range", "time-range"] as const) {
  const pair =
    mode === "time-range"
      ? (["0000-01-01T10:00:00.000Z", "0000-01-01T12:00:00.000Z"] as const)
      : ([a, b] as const);
  test(`${mode}: ordered callback arguments, acceptance and rejection`, () => {
    for (const rejection of [null, error("custom-validator", pair)]) {
      const calls: unknown[] = [];
      assert.deepEqual(
        validateSelection(
          [pair[1], pair[0]],
          {
            mode,
            rangeValidator: (value, actualMode) => {
              calls.push([value, actualMode]);
              return rejection;
            },
          },
          adapter,
        ),
        rejection ? [rejection] : [],
      );
      assert.deepEqual(calls, [[pair, mode]]);
    }
  });
  test(`${mode}: thrown range callback propagates`, () => {
    const failure = new Error("range failure");
    assert.throws(
      () =>
        validateSelection(
          pair,
          {
            mode,
            rangeValidator: () => {
              throw failure;
            },
          },
          adapter,
        ),
      (e) => e === failure,
    );
  });
  test(`${mode}: invalid and empty values do not invoke range callback`, () => {
    let calls = 0;
    for (const value of [null, ["invalid", b]] as const)
      validateSelection(
        value,
        {
          mode,
          rangeValidator: () => {
            calls++;
            return null;
          },
        },
        adapter,
      );
    assert.equal(calls, 0);
  });
}
test("additional validators preserve input, ordering, errors and thrown identity", () => {
  const rejection = error("custom-validator", a),
    calls: unknown[] = [];
  assert.deepEqual(
    validateSelection(
      a,
      {
        mode: "date",
        validators: [
          (value) => {
            calls.push(value);
            return null;
          },
          (value) => {
            calls.push(value);
            return rejection;
          },
        ],
      },
      adapter,
    ),
    [rejection],
  );
  assert.deepEqual(calls, [a, a]);
  const failure = new Error("value failure");
  assert.throws(
    () =>
      validateSelection(
        a,
        {
          validators: [
            () => {
              throw failure;
            },
          ],
        },
        adapter,
      ),
    (e) => e === failure,
  );
});
test("additional validators run for malformed ISO, skip empty and wrong shape", () => {
  const calls: unknown[] = [];
  const config = {
    validators: [
      (value: any) => {
        calls.push(value);
        return null;
      },
    ],
  };
  validateSelection("invalid", config, adapter);
  validateSelection(null, config, adapter);
  validateSelection([a, b], config, adapter);
  assert.deepEqual(calls, ["invalid"]);
});

for (const mode of ["date-range", "datetime-range", "time-range"] as const)
  test(`${mode}: range callback orders endpoints while validators retain input`, () => {
    const pair =
      mode === "time-range"
        ? (["0000-01-01T10:00:00.000Z", "0000-01-01T12:00:00.000Z"] as const)
        : ([a, b] as const);
    const input = [pair[1], pair[0]] as const;
    const first = error("custom-validator", pair, "range");
    const second = error("custom-validator", input);
    const calls: string[] = [];
    assert.deepEqual(
      validateSelection(
        input,
        {
          mode,
          rangeValidator: (value, actualMode) => {
            assert.deepEqual(value, pair);
            assert.equal(actualMode, mode);
            calls.push("range");
            return first;
          },
          validators: [
            (value) => {
              assert.equal(value, input);
              calls.push("accept");
              return null;
            },
            (value) => {
              assert.equal(value, input);
              calls.push("reject");
              return second;
            },
          ],
        },
        adapter,
      ),
      [first, second],
    );
    assert.deepEqual(calls, ["range", "accept", "reject"]);
    const failure = new Error("range value validator failure");
    assert.throws(
      () =>
        validateSelection(
          input,
          {
            mode,
            validators: [
              (value) => {
                assert.equal(value, input);
                throw failure;
              },
            ],
          },
          adapter,
        ),
      (e) => e === failure,
    );
  });
