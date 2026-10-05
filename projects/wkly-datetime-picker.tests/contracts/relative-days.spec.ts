import { strict as assert } from "node:assert";
import { test } from "./test";
import {
  WklyGregorianCalendarAdapter,
  gregorianDay,
} from "wkly-datetime-picker.adapters";
import {
  WklyDraft,
  draftDayDifference,
  setDraftDayDifference,
  validateDrafts,
} from "wkly-datetime-picker";
import { ShowcaseHebrewCalendarAdapter } from "../../wkly-datetime-picker.showcase/src/hebrew-adapter";
import { ShowcaseHijriCalendarAdapter } from "../../wkly-datetime-picker.showcase/src/hijri-adapter";

const adapter = new WklyGregorianCalendarAdapter("en-GB");
const draft = (day: number): WklyDraft => ({
  date: adapter.epochDayToDate(day),
  hour: 13,
  minute: 25,
  second: 42,
  present: true,
});
const validate = (drafts: WklyDraft[], selection = {}) =>
  validateDrafts({
    drafts,
    adapter,
    configErrors: [],
    selection: { mode: "datetime-range", showSeconds: true, ...selection },
    mode: "datetime-range",
    isRange: true,
    hasDate: true,
    hasTime: true,
    showSeconds: true,
    required: false,
  });

test("relative days follow calendar/date changes, start changes and swapped endpoints", () => {
  const start = gregorianDay(2024, 2, 28);
  const drafts = [draft(start), draft(start)];
  assert.equal(draftDayDifference(drafts, adapter), 0);
  drafts[1].date = adapter.epochDayToDate(start + 17);
  assert.equal(draftDayDifference(drafts, adapter), 17);
  drafts[1].date = { ...drafts[1].date, day: drafts[1].date.day + 1 };
  assert.equal(draftDayDifference(drafts, adapter), 18);
  drafts[0].date = adapter.epochDayToDate(start + 1);
  assert.equal(draftDayDifference(drafts, adapter), 17);
  setDraftDayDifference(drafts, adapter, -17);
  assert.equal(draftDayDifference(drafts, adapter), -17);
  drafts.reverse();
  assert.equal(draftDayDifference(drafts, adapter), 17);
});

test("relative end edits preserve times, cross leap days and reuse selection constraints", () => {
  const start = gregorianDay(2024, 2, 28);
  const drafts = [draft(start), { ...draft(start), hour: 16 }];
  const end = drafts[1];
  setDraftDayDifference(drafts, adapter, 2);
  assert.equal(drafts[1], end);
  assert.equal(end.date.month, 3);
  assert.equal(end.date.day, 1);
  assert.equal(end.hour, 16);
  assert.equal(end.minute, 25);
  assert.equal(end.second, 42);
  assert.deepEqual(validate(drafts).errors, []);
  assert(
    validate(drafts, { max: "2024-02-29T23:59:59.000Z" }).errors.some(
      (e) => e.code === "above-maximum",
    ),
  );
  assert(
    validate(drafts, {
      isDateDisabled: (day: number) => day === start + 2,
    }).errors.some((e) => e.code === "disabled-endpoint"),
  );
});

test("relative offsets preserve unsupported end dates and recover without another value store", () => {
  for (const [boundary, days] of [
    [adapter.supportedEpochDayRange[0], -1],
    [adapter.supportedEpochDayRange[1], 1],
  ]) {
    const drafts = [draft(boundary), draft(boundary)];
    setDraftDayDifference(drafts, adapter, days);
    assert.equal(draftDayDifference(drafts, adapter), days);
    assert.equal(drafts[1].unsupportedEpochDay, boundary + days);
    const result = validate(drafts);
    assert.equal(result.pendingValue, null);
    assert.deepEqual(
      result.errors.map((e) => [e.code, e.endpoint]),
      [["unsupported-adapter-date", "end"]],
    );
    setDraftDayDifference(drafts, adapter, 0);
    assert.equal(drafts[1].unsupportedEpochDay, undefined);
    assert.deepEqual(validate(drafts).errors, []);
  }
});

test("relative days accept signed limits and retain incomplete calendar drafts", () => {
  const start = gregorianDay(2024, 2, 28);
  const drafts = [draft(start), draft(start)];
  for (const days of [-9999, 9999, 0]) {
    setDraftDayDifference(drafts, adapter, days);
    assert.equal(draftDayDifference(drafts, adapter), days);
  }
  for (const invalid of [null, 10000, -10000, 1.5]) {
    setDraftDayDifference(drafts, adapter, invalid);
    assert.equal(draftDayDifference(drafts, adapter), null);
    assert(validate(drafts).errors.some((e) => e.code === "incomplete"));
  }
  drafts[0].date = { ...drafts[0].date, day: 31 };
  setDraftDayDifference(drafts, adapter, 1);
  assert.equal(draftDayDifference(drafts, adapter), null);
  assert(
    validate(drafts).errors.some((e) => e.code === "invalid-calendar-date"),
  );
});

test("relative days use epoch arithmetic with Hebrew and Hijri adapters", () => {
  for (const calendar of [
    new ShowcaseHebrewCalendarAdapter("he-IL"),
    new ShowcaseHijriCalendarAdapter("ar-EG"),
  ]) {
    const start = gregorianDay(2024, 3, 10);
    const drafts = [draft(start), draft(start)].map((d) => ({
      ...d,
      date: calendar.epochDayToDate(start),
    }));
    for (const days of [-17, 0, 17, 9999]) {
      setDraftDayDifference(drafts, calendar, days);
      assert.equal(calendar.dateToEpochDay(drafts[1].date), start + days);
      assert.equal(draftDayDifference(drafts, calendar), days);
    }
  }
});
