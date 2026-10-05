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
import { integer, floorMod, WklyWeek } from "wkly-datetime-picker.core";

/** Source-only islamic-civil example: Friday epoch and the 30-year civil leap cycle. */
export class ShowcaseHijriCalendarAdapter extends WklyCalendarAbstractAdapter {
  readonly calendarId = "islamic-civil";
  readonly supportedEpochDayRange = Object.freeze([
    gregorianDay(1900, 1, 1),
    gregorianDay(2100, 12, 31),
  ]) as readonly [number, number];
  readonly supportedYearRange = Object.freeze([1317, 1524]) as readonly [
    number,
    number,
  ];
  private gregorian: WklyGregorianCalendarAdapter;
  constructor(locale = "ar-EG") {
    super(locale);
    this.gregorian = new WklyGregorianCalendarAdapter(locale);
  }
  private start(year: number, month = 1): number {
    return (
      gregorianDay(622, 7, 19) +
      354 * (year - 1) +
      Math.floor((3 + 11 * year) / 30) +
      Math.ceil(29.5 * (month - 1))
    );
  }
  getMonths(year: number): readonly WklyCalendarMonth[] {
    if (!Number.isInteger(year)) return [];
    // Older supported TypeScript libraries omit the standard calendar option.
    const options: Intl.DateTimeFormatOptions & { calendar: string } = {
      month: "long",
      timeZone: "UTC",
      calendar: "islamic-civil",
    };
    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthCode: "M" + String(i + 1).padStart(2, "0"),
      label: this.getDateTimeFormatter(options).format(
        new Date(this.start(year, i + 1) * 86400000),
      ),
    }));
  }
  getDaysInMonth(year: number, code: string): number {
    if (!Number.isInteger(year) || !/^M(0[1-9]|1[0-2])$/.test(code)) return 0;
    const month = Number(code.slice(1));
    return month % 2 === 1 ||
      (month === 12 && floorMod(11 * year + 14, 30) < 11)
      ? 30
      : 29;
  }
  validateDate(d: WklyCalendarDate): readonly WklyCalendarDateError[] {
    const invalid = (
      field: "year" | "month" | "day",
      code = "invalid-calendar-date",
    ) => ({ code, field, messageKey: code });
    if (!Number.isInteger(d.year) || d.year < 1317 || d.year > 1524)
      return [invalid("year", "unsupported-adapter-date")];
    if (
      d.calendarId !== this.calendarId ||
      !Number.isInteger(d.month) ||
      d.month < 1 ||
      d.month > 12 ||
      d.monthCode !== "M" + String(d.month).padStart(2, "0")
    )
      return [invalid("month")];
    if (
      !Number.isInteger(d.day) ||
      d.day < 1 ||
      d.day > this.getDaysInMonth(d.year, d.monthCode)
    )
      return [invalid("day")];
    const epochDay = this.start(d.year, d.month) + d.day - 1;
    if (
      epochDay < this.supportedEpochDayRange[0] ||
      epochDay > this.supportedEpochDayRange[1]
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
    return this.start(d.year, d.month) + d.day - 1;
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
    let year = Math.floor(
      (30 * (day - gregorianDay(622, 7, 19)) + 10646) / 10631,
    );
    while (this.start(year) > day) year--;
    while (this.start(year + 1) <= day) year++;
    let month = 1;
    while (month < 12 && this.start(year, month + 1) <= day) month++;
    return {
      calendarId: this.calendarId,
      year,
      month,
      monthCode: "M" + String(month).padStart(2, "0"),
      day: day - this.start(year, month) + 1,
    };
  }
  addYears(d: WklyCalendarDate, amount: number): WklyCalendarDate {
    return { ...d, year: d.year + integer(amount) };
  }
  addMonths(d: WklyCalendarDate, amount: number): WklyCalendarDate {
    const index = d.month - 1 + integer(amount),
      month = floorMod(index, 12) + 1;
    // Keep an impossible day editable instead of silently clamping the draft.
    return {
      ...d,
      year: d.year + Math.floor(index / 12),
      month,
      monthCode: "M" + String(month).padStart(2, "0"),
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
    return this.getNumberFormatter({ useGrouping: false }).format(d.year);
  }
  formatDate(d: WklyCalendarDate): string {
    return `${this.formatDay(d)} ${this.formatMonth(d)} ${this.formatYear(d)}`;
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
