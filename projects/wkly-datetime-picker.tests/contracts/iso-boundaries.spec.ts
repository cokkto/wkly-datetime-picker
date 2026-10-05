import { strict as assert } from "node:assert";
import { test } from "./test";
import {
  decodeIso,
  encodeIso,
  error,
  gregorianDay,
  WklyGregorianCalendarAdapter,
  WklyValidationException,
  validateSelection,
} from "wkly-datetime-picker.adapters";
const adapter = new WklyGregorianCalendarAdapter();
for (const [year, month, day, epoch, iso] of [
  [0, 1, 1, -719528, "0000-01-01T00:00:00.000Z"],
  [9999, 12, 31, 2932896, "9999-12-31T23:59:59.000Z"],
] as const)
  test(`exact Gregorian ${year} conversion and ISO roundtrip`, () => {
    assert.equal(gregorianDay(year, month, day), epoch);
    const date = adapter.epochDayToDate(epoch);
    assert.equal(date.year, year);
    assert.equal(date.month, month);
    assert.equal(date.day, day);
    assert.equal(adapter.dateToEpochDay(date), epoch);
    assert.equal(decodeIso(iso).epochDay, epoch);
    assert.equal(encodeIso(decodeIso(iso), "datetime", true), iso);
    assert.deepEqual(
      validateSelection(
        iso,
        {
          mode: "datetime",
          showSeconds: true,
          min: iso,
          max: iso,
        },
        adapter,
      ),
      [],
    );
  });
test("reject days immediately outside Gregorian interval", () => {
  for (const day of [-719529, 2932897])
    assert.throws(
      () => adapter.epochDayToDate(day),
      (failure: unknown) => {
        assert(failure instanceof WklyValidationException);
        assert.deepEqual(failure.errors, [
          error("unsupported-adapter-date", day),
        ]);
        return true;
      },
    );
  for (const iso of ["-0001-12-31T00:00:00.000Z", "10000-01-01T00:00:00.000Z"])
    assert.throws(
      () => decodeIso(iso),
      (failure: unknown) => {
        assert(failure instanceof WklyValidationException);
        assert.deepEqual(failure.errors, [error("malformed-iso", iso)]);
        return true;
      },
    );
});
test("UTC fields survive host timezone and DST boundaries", () => {
  assert.deepEqual(decodeIso("2024-11-03T01:30:00.000Z"), {
    epochDay: Date.UTC(2024, 10, 3) / 86400000,
    hour: 1,
    minute: 30,
    second: 0,
  });
  for (const iso of [
    "2024-03-10T01:59:59.000Z",
    "2024-11-03T01:30:00.000Z",
    "1969-12-31T23:59:59.000Z",
  ])
    assert.equal(encodeIso(decodeIso(iso), "datetime", true), iso);
  if (process.env.TZ === "America/New_York")
    assert.notEqual(new Date("2024-07-01T00:00:00Z").getTimezoneOffset(), 0);
});
