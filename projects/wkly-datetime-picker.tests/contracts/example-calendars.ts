import { assert, test } from "../helpers/harness";
import { calendarMonthBounds } from "wkly-datetime-picker";
import { ShowcaseHebrewCalendarAdapter } from "../../wkly-datetime-picker.showcase/src/hebrew-adapter";
import { ShowcaseHijriCalendarAdapter } from "../../wkly-datetime-picker.showcase/src/hijri-adapter";
import {
  gregorianDay,
  encodeIso,
  decodeIso,
  WklyValidationException,
} from "wkly-datetime-picker.adapters";

const hijri = new ShowcaseHijriCalendarAdapter("ar");
const hebrew = new ShowcaseHebrewCalendarAdapter("he-IL");
test("month viewport accepts a supported Hijri anchor with an unsupported first day", () => {
  const anchor = gregorianDay(1900, 1, 1);
  const date = hijri.epochDayToDate(anchor);
  assert.equal(date.day, 28);
  assert.throws(
    () => hijri.dateToEpochDay({ ...date, day: 1 }),
    WklyValidationException,
  );
  const bounds = calendarMonthBounds(hijri, anchor);
  assert.deepEqual(bounds, [
    gregorianDay(1899, 12, 5),
    gregorianDay(1900, 1, 2),
  ]);
  assert(Object.isFrozen(bounds));
  assert.equal(hijri.dateToEpochDay(date), anchor);
});
test("month viewport keeps full coordinates when both month edges are unsupported", () => {
  const adapter = new ShowcaseHijriCalendarAdapter("en-US");
  // A host adapter may expose a shorter interval than either boundary month.
  const anchor = gregorianDay(2024, 3, 25);
  Object.defineProperty(adapter, "supportedEpochDayRange", {
    value: [anchor, anchor + 1],
  });
  const date = adapter.epochDayToDate(anchor);
  assert.throws(
    () => adapter.dateToEpochDay({ ...date, day: 1 }),
    WklyValidationException,
  );
  assert.throws(
    () => adapter.dateToEpochDay({ ...date, day: 30 }),
    WklyValidationException,
  );
  assert.deepEqual(calendarMonthBounds(adapter, anchor), [
    gregorianDay(2024, 3, 11),
    gregorianDay(2024, 4, 9),
  ]);
  assert.deepEqual(
    calendarMonthBounds(adapter, anchor + 1),
    calendarMonthBounds(adapter, anchor),
  );
  assert.throws(
    () => calendarMonthBounds(adapter, anchor - 1),
    WklyValidationException,
  );
});
for (const adapter of [hebrew, hijri]) {
  test(
    adapter.calendarId +
      ": exact bounds, errors, UTC values and invalid drafts",
    () => {
      const [min, max] = adapter.supportedEpochDayRange;
      assert.equal(min, gregorianDay(1900, 1, 1));
      assert.equal(max, gregorianDay(2100, 12, 31));
      for (const day of [min, max, -1, gregorianDay(2024, 3, 10)]) {
        const date = adapter.epochDayToDate(day);
        assert.equal(adapter.dateToEpochDay(date), day);
        const wire = encodeIso(
          {
            epochDay: adapter.dateToEpochDay(date),
            hour: 0,
            minute: 0,
            second: 0,
          },
          "date",
        );
        assert.equal(wire, new Date(day * 86400000).toISOString());
        assert.equal(decodeIso(wire).epochDay, day);
        assert.equal(adapter.validateDate(date).length, 0);
      }
      for (const day of [min - 1, max + 1, NaN, 0.5, Number.MAX_SAFE_INTEGER])
        assert.throws(
          () => adapter.epochDayToDate(day),
          (e: unknown) =>
            e instanceof WklyValidationException &&
            e.errors[0].code === "unsupported-adapter-date",
        );
      const date = adapter.epochDayToDate(gregorianDay(2024, 3, 25));
      for (const draft of [
        { ...date, day: 0 },
        { ...date, day: 31 },
        { ...date, month: 0 },
        { ...date, monthCode: "bad" },
        { ...date, calendarId: "gregorian" },
      ]) {
        assert.equal(
          adapter.validateDate(draft)[0].code,
          "invalid-calendar-date",
        );
        assert.throws(
          () => adapter.dateToEpochDay(draft),
          WklyValidationException,
        );
      }
      assert.equal(
        adapter.validateDate({ ...date, year: 1 })[0].code,
        "unsupported-adapter-date",
      );
      assert.equal(adapter.normalizeDigits("١٢٣۴۵۶"), "123456");
      assert(
        adapter.formatAccessibleDate(date).includes(adapter.formatMonth(date)),
      );
      assert(adapter.formatDate(date).includes(adapter.formatYear(date)));
    },
  );
}
test("Hijri known pairs and full advertised interval match independent Intl civil calendar", () => {
  for (const [year, month, day, iso] of [
    [1445, 9, 1, "2024-03-11"],
    [1445, 9, 15, "2024-03-25"],
    [1317, 8, 28, "1900-01-01"],
    [1524, 10, 29, "2100-12-31"],
  ] as const) {
    const epoch = decodeIso(iso + "T00:00:00.000Z").epochDay;
    assert.deepEqual(hijri.epochDayToDate(epoch), {
      calendarId: "islamic-civil",
      year,
      month,
      monthCode: "M" + String(month).padStart(2, "0"),
      day,
    });
  }
  const oracle = new Intl.DateTimeFormat("en-US", {
    calendar: "islamic-civil",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  });
  for (
    let day = hijri.supportedEpochDayRange[0];
    day <= hijri.supportedEpochDayRange[1];
    day++
  ) {
    const date = hijri.epochDayToDate(day);
    assert.equal(hijri.dateToEpochDay(date), day);
    const parts = oracle.formatToParts(new Date(day * 86400000));
    for (const key of ["year", "month", "day"] as const)
      assert.equal(date[key], Number(parts.find((p) => p.type === key)!.value));
  }
});
test("Hijri month identities, leap cycle and impossible month/year transitions", () => {
  const leap = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];
  for (let year = 1441; year <= 1470; year++) {
    const months = hijri.getMonths(year);
    assert.equal(months.length, 12);
    months.forEach((m, i) => {
      assert.equal(m.month, i + 1);
      assert.equal(m.monthCode, "M" + String(i + 1).padStart(2, "0"));
      assert(m.label.length);
    });
    assert.equal(
      hijri.getDaysInMonth(year, "M12"),
      leap.includes(year % 30 || 30) ? 30 : 29,
    );
    for (let month = 1; month < 12; month++)
      assert.equal(
        hijri.getDaysInMonth(year, months[month - 1].monthCode),
        month % 2 ? 30 : 29,
      );
  }
  const date = {
    calendarId: "islamic-civil",
    year: 1445,
    month: 12,
    monthCode: "M12",
    day: 30,
  };
  assert.equal(hijri.validateDate(date).length, 0);
  assert.equal(hijri.addMonths(date, 1).year, 1446);
  assert.equal(hijri.addMonths(date, 1).monthCode, "M01");
  assert.deepEqual(hijri.addMonths(hijri.addMonths(date, 13), -13), date);
  const invalid = hijri.addYears(date, 1);
  assert.equal(invalid.day, 30);
  assert.equal(hijri.validateDate(invalid)[0].code, "invalid-calendar-date");
  assert.equal(
    hijri.validateDate(
      hijri.addMonths({ ...date, month: 1, monthCode: "M01" }, 1),
    )[0].code,
    "invalid-calendar-date",
  );
  assert.equal(hijri.getDaysInMonth(1445, "M13"), 0);
});
test("Hebrew known pairs, leap-month identity and year transitions", () => {
  assert.deepEqual(hebrew.epochDayToDate(gregorianDay(2024, 3, 25)), {
    calendarId: "hebrew",
    year: 5784,
    month: 7,
    monthCode: "H13",
    day: 15,
  });
  assert.deepEqual(hebrew.epochDayToDate(gregorianDay(2023, 9, 16)), {
    calendarId: "hebrew",
    year: 5784,
    month: 1,
    monthCode: "H7",
    day: 1,
  });
  assert.equal(hebrew.getMonths(5784).length, 13);
  assert.equal(hebrew.getMonths(5785).length, 12);
  assert.equal(hebrew.getDaysInMonth(5784, "H13"), 29);
  assert.equal(hebrew.getDaysInMonth(5785, "H13"), 0);
  const last = {
    calendarId: "hebrew",
    year: 5784,
    month: 13,
    monthCode: "H6",
    day: 29,
  };
  const next = hebrew.addMonths(last, 1);
  assert.equal(next.year, 5785);
  assert.equal(next.monthCode, "H7");
  assert.deepEqual(hebrew.addMonths(next, -1), last);
  const adar = hebrew.epochDayToDate(gregorianDay(2024, 3, 25));
  const invalid = hebrew.addYears(adar, 1);
  assert.equal(invalid.monthCode, "H13");
  assert.equal(hebrew.validateDate(invalid)[0].code, "invalid-calendar-date");
});
