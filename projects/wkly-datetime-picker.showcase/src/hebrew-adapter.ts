import { HDate } from "@hebcal/core";
import {
  WklyCalendarAbstractAdapter,
  WklyCalendarDate,
  WklyCalendarDateError,
  WklyCalendarMonth,
  WklyGregorianCalendarAdapter,
  WklyValidationException,
  error,
  gregorianDay,
  normalizeDigits,
  WklyWeekLabelMode,
} from "wkly-datetime-picker.adapters";
import { integer, WklyWeek } from "wkly-datetime-picker.core";
/** Showcase-only extension. Stable month codes use Hebcal's Nisan-based identities. */
export class ShowcaseHebrewCalendarAdapter extends WklyCalendarAbstractAdapter {
  readonly calendarId = "hebrew";
  readonly supportedEpochDayRange = Object.freeze([
    gregorianDay(1900, 1, 1),
    gregorianDay(2100, 12, 31),
  ]) as readonly [number, number];
  readonly supportedYearRange = Object.freeze([5660, 5861]) as readonly [
    number,
    number,
  ];
  private gregorian: WklyGregorianCalendarAdapter;
  constructor(locale = "he-IL") {
    super(locale);
    this.gregorian = new WklyGregorianCalendarAdapter(locale);
  }
  private monthNumbers(year: number): number[] {
    return [7, 8, 9, 10, 11, 12]
      .concat(HDate.isLeapYear(year) ? [13] : [])
      .concat([1, 2, 3, 4, 5, 6]);
  }
  getMonths(year: number): readonly WklyCalendarMonth[] {
    if (!Number.isInteger(year)) return [];
    return this.monthNumbers(year).map((n, i) => ({
      month: i + 1,
      monthCode: "H" + n,
      label: this.getDateTimeFormatter(
        { month: "long", timeZone: "UTC" },
        this.locale + "-u-ca-hebrew",
      ).format(new Date((new HDate(1, n, year).abs() - 719163) * 86400000)),
    }));
  }
  getDaysInMonth(year: number, code: string): number {
    const n = Number(code.slice(1));
    return Number.isInteger(year) && this.monthNumbers(year).includes(n)
      ? HDate.daysInMonth(n, year)
      : 0;
  }
  validateDate(d: WklyCalendarDate): readonly WklyCalendarDateError[] {
    const invalid = (
      field: "year" | "month" | "day",
      code = "invalid-calendar-date",
    ) => ({ code, field, messageKey: code });
    if (!Number.isInteger(d.year) || d.year < 5660 || d.year > 5861)
      return [invalid("year", "unsupported-adapter-date")];
    const month = this.monthNumbers(d.year)[d.month - 1];
    if (
      d.calendarId !== this.calendarId ||
      !month ||
      d.monthCode !== "H" + month
    )
      return [invalid("month")];
    if (
      !Number.isInteger(d.day) ||
      d.day < 1 ||
      d.day > this.getDaysInMonth(d.year, d.monthCode)
    )
      return [invalid("day")];
    const day = new HDate(d.day, +d.monthCode.slice(1), d.year).abs() - 719163;
    if (
      day < this.supportedEpochDayRange[0] ||
      day > this.supportedEpochDayRange[1]
    )
      return [invalid("year", "unsupported-adapter-date")];
    return [];
  }
  dateToEpochDay(d: WklyCalendarDate): number {
    const errors = this.validateDate(d);
    if (errors.length)
      throw new WklyValidationException(
        errors.map((e) => error(e.code as any, d, e.field)),
      );
    return new HDate(d.day, +d.monthCode.slice(1), d.year).abs() - 719163;
  }
  epochDayToDate(day: number): WklyCalendarDate {
    if (
      !Number.isSafeInteger(day) ||
      day < this.supportedEpochDayRange[0] ||
      day > this.supportedEpochDayRange[1]
    )
      throw new WklyValidationException([
        error("unsupported-adapter-date", day),
      ]);
    const d = new HDate(day + 719163);
    return {
      calendarId: this.calendarId,
      year: d.getFullYear(),
      month: this.monthNumbers(d.getFullYear()).indexOf(d.getMonth()) + 1,
      monthCode: "H" + d.getMonth(),
      day: d.getDate(),
    };
  }
  addYears(d: WklyCalendarDate, amount: number): WklyCalendarDate {
    const year = d.year + integer(amount);
    const month = this.getMonths(year).find((m) => m.monthCode === d.monthCode);
    return { ...d, year, month: month ? month.month : d.month };
  }
  addMonths(d: WklyCalendarDate, amount: number): WklyCalendarDate {
    integer(amount);
    let year = d.year,
      month = d.month + amount;
    while (month < 1) {
      year--;
      month += this.monthNumbers(year).length;
    }
    while (month > this.monthNumbers(year).length) {
      month -= this.monthNumbers(year).length;
      year++;
    }
    return {
      ...d,
      year,
      month,
      monthCode: "H" + this.monthNumbers(year)[month - 1],
    };
  }
  formatDay(d: WklyCalendarDate): string {
    return this.getNumberFormatter().format(d.day);
  }
  formatMonth(d: WklyCalendarDate): string {
    return (
      this.getMonths(d.year).find((m) => m.monthCode === d.monthCode)?.label ||
      d.monthCode
    );
  }
  formatYear(d: WklyCalendarDate): string {
    return String(d.year);
  }
  formatDate(d: WklyCalendarDate): string {
    return `${this.formatDay(d)} ${this.formatMonth(d)} ${d.year}`;
  }
  formatAccessibleDate(d: WklyCalendarDate): string {
    return (
      this.formatWeekday(this.dateToEpochDay(d), "long") +
      ", " +
      this.formatDate(d)
    );
  }
  formatWeekday(day: number, width: "short" | "long"): string {
    return this.gregorian.formatWeekday(day, width);
  }
  formatWeekLabel(week: WklyWeek, mode: WklyWeekLabelMode): string {
    return this.gregorian.formatWeekLabel(week, mode);
  }
  normalizeDigits(input: string): string {
    return normalizeDigits(input);
  }
}
