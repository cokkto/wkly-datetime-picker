import { EpochDay, WklyWeek, WklyWeekOffset, floorDiv, floorMod, integer, orderedRange } from 'wkly-datetime-picker.core';
export interface WklyCalendarDate { readonly calendarId: string; readonly year: number; readonly month: number; readonly monthCode: string; readonly day: number; readonly era?: string; }
export interface WklyCalendarMonth { readonly month: number; readonly monthCode: string; readonly label: string; }
export interface WklyCalendarDateError { readonly code: string; readonly field?: 'era' | 'year' | 'month' | 'day'; readonly messageKey: string; }
export type WklyWeekLabelMode = 'locale' | 'iso' | 'absolute-week' | 'hidden';
export interface WklyCalendarAdapter {
  readonly calendarId: string; readonly supportedEpochDayRange: readonly [EpochDay, EpochDay]; readonly supportedYearRange: readonly [number, number];
  validateDate(date: WklyCalendarDate): readonly WklyCalendarDateError[];
  dateToEpochDay(date: WklyCalendarDate): EpochDay; epochDayToDate(epochDay: EpochDay): WklyCalendarDate;
  getMonths(year: number, era?: string): readonly WklyCalendarMonth[]; getDaysInMonth(year: number, monthCode: string, era?: string): number;
  addMonths(date: WklyCalendarDate, amount: number): WklyCalendarDate; addYears(date: WklyCalendarDate, amount: number): WklyCalendarDate;
  formatDay(date: WklyCalendarDate): string; formatMonth(date: WklyCalendarDate): string; formatYear(date: WklyCalendarDate): string;
  formatDate(date: WklyCalendarDate): string; formatAccessibleDate(date: WklyCalendarDate): string;
  formatWeekday(epochDay: EpochDay, width: 'short' | 'long'): string;
  formatWeekLabel(week: WklyWeek, mode: WklyWeekLabelMode): string; normalizeDigits(input: string): string;
}
export type WklyWeekLabelFormatter = (week: WklyWeek, adapter: WklyCalendarAdapter) => string;
export type WklySelectionMode = 'datetime' | 'date' | 'time' | 'datetime-range' | 'date-range' | 'time-range';
export type WklyIsoString = string;
export type WklyRangeValue = readonly [WklyIsoString, WklyIsoString];
export type WklyPickerValue = WklyIsoString | WklyRangeValue | null;
export type WklyEndpoint = 'single' | 'start' | 'end';
export type WklyHourCycle = 'locale' | 'h12' | 'h24' | 'switchable';
export type WklyViewportPreset = { kind: 'full-month' } | { kind: 'full-month-and-around'; extraWeeksBefore?: number; extraWeeksAfter?: number } | { kind: 'weeks'; visibleWeekCount: number };
export type WklyValidationErrorCode = 'malformed-iso' | 'wrong-value-shape' | 'incomplete' | 'invalid-calendar-date' | 'unsupported-adapter-date' | 'below-minimum' | 'above-maximum' | 'disabled-endpoint' | 'range-crosses-disabled' | 'invalid-time' | 'step-mismatch' | 'custom-validator' | 'configuration-error';
export interface WklyValidationError { readonly code: WklyValidationErrorCode; readonly messageKey: string; readonly endpoint?: WklyEndpoint; readonly field?: string; readonly rejectedValue?: unknown; readonly details?: Readonly<Record<string, unknown>>; }
export function error(code: WklyValidationErrorCode, rejectedValue?: unknown, field?: string, endpoint?: WklyEndpoint): WklyValidationError { return { code, messageKey: code, rejectedValue, field, endpoint }; }
export class WklyValidationException extends RangeError { constructor(public readonly errors: readonly WklyValidationError[]) { super(errors.map(e => e.code).join(', ')); this.name = 'WklyValidationException'; } }
export interface WklyDatePredicateContext { readonly mode: WklySelectionMode; readonly endpoint: WklyEndpoint; readonly calendarDate: WklyCalendarDate; }
export interface WklyTimePredicateContext { readonly mode: WklySelectionMode; readonly endpoint: WklyEndpoint; }
export type WklyDisabledDatePredicate = (epochDay: EpochDay, context: WklyDatePredicateContext) => boolean;
export type WklyDisabledTimePredicate = (secondsSinceMidnight: number, context: WklyTimePredicateContext) => boolean;
export type WklyRangeValidator = (range: WklyRangeValue, mode: 'datetime-range' | 'date-range' | 'time-range') => WklyValidationError | null;
export interface WklySelectionConfig {
  readonly mode?: WklySelectionMode; readonly showSeconds?: boolean; readonly minuteStep?: number; readonly secondStep?: number;
  readonly min?: string | null; readonly max?: string | null; readonly required?: boolean; readonly allowRangeAcrossDisabled?: boolean;
  readonly isDateDisabled?: WklyDisabledDatePredicate | null; readonly isTimeDisabled?: WklyDisabledTimePredicate | null;
  readonly rangeValidator?: WklyRangeValidator | null; readonly validators?: readonly ((value: WklyPickerValue) => WklyValidationError | null)[];
}
export function gregorianDay(year: number, month: number, day: number): number {
  const y = year - (month <= 2 ? 1 : 0), era = floorDiv(y, 400), yo = y - era * 400;
  const mp = month + (month > 2 ? -3 : 9);
  return era * 146097 + yo * 365 + Math.floor(yo / 4) - Math.floor(yo / 100) + Math.floor((153 * mp + 2) / 5) + day - 1 - 719468;
}
export function gregorianDate(epochDay: number): WklyCalendarDate {
  integer(epochDay); const z = epochDay + 719468, era = floorDiv(z, 146097), doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)), mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1, month = mp + (mp < 10 ? 3 : -9), year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return { calendarId: 'gregory', year, month, monthCode: 'M' + pad(month), day };
}
export function pad(n: number, width = 2): string { return String(n).padStart(width, '0'); }
export function normalizeDigits(input: string): string {
  const zeros = [48, 0x660, 0x6f0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0xe50, 0xed0, 0xff10];
  return Array.from(input).map(c => { const cp = c.codePointAt(0)!; const zero = zeros.find(z => cp >= z && cp <= z + 9); return zero === undefined ? '' : String(cp - zero); }).join('');
}
/** Locale week start, optionally supplied from registered Angular locale data. */
export function resolveWeekOffset(locale: string, explicit?: WklyWeekOffset | null, application?: WklyWeekOffset | null, firstDay?: number): WklyWeekOffset {
  if (explicit !== undefined && explicit !== null) { integer(explicit); if (explicit < 0 || explicit > 6) throw new RangeError('Invalid offset'); return explicit; }
  if (application !== undefined && application !== null) return resolveWeekOffset(locale, application);
  if (firstDay === undefined) {
    const Ctor = (Intl as any).Locale;
    if (Ctor) { const loc = new Ctor(locale); const info = loc.weekInfo || (loc.getWeekInfo && loc.getWeekInfo()); if (info) firstDay = info.firstDay % 7; }
  }
  return firstDay === undefined ? 0 : floorMod(firstDay - 4, 7) as WklyWeekOffset;
}
export class WklyGregorianCalendarAdapter implements WklyCalendarAdapter {
  readonly calendarId = 'gregory'; readonly supportedEpochDayRange = Object.freeze([-719528, 2932896]) as readonly [number, number]; readonly supportedYearRange = Object.freeze([0, 9999]) as readonly [number, number];
  constructor(public readonly locale = 'en-US') {}
  validateDate(d: WklyCalendarDate): readonly WklyCalendarDateError[] {
    const errors: WklyCalendarDateError[] = [];
    if (!Number.isInteger(d.year) || d.year < 0 || d.year > 9999) errors.push({ code: 'unsupported-adapter-date', field: 'year', messageKey: 'unsupported-adapter-date' });
    if (d.calendarId !== this.calendarId || !Number.isInteger(d.month) || d.month < 1 || d.month > 12 || d.monthCode !== 'M' + pad(d.month)) errors.push({ code: 'invalid-calendar-date', field: 'month', messageKey: 'invalid-calendar-date' });
    if (!Number.isInteger(d.day) || d.day < 1 || d.day > this.getDaysInMonth(d.year, d.monthCode)) errors.push({ code: 'invalid-calendar-date', field: 'day', messageKey: 'invalid-calendar-date' });
    return errors;
  }
  dateToEpochDay(d: WklyCalendarDate): number { const errors = this.validateDate(d); if (errors.length) throw new WklyValidationException(errors.map(e => error(e.code as WklyValidationErrorCode, d, e.field))); return gregorianDay(d.year, d.month, d.day); }
  epochDayToDate(day: number): WklyCalendarDate { if (!Number.isSafeInteger(day) || day < this.supportedEpochDayRange[0] || day > this.supportedEpochDayRange[1]) throw new WklyValidationException([error('unsupported-adapter-date', day)]); return gregorianDate(day); }
  getMonths(year: number): readonly WklyCalendarMonth[] { return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, monthCode: 'M' + pad(i + 1), label: this.formatMonth({ calendarId: this.calendarId, year, month: i + 1, monthCode: 'M' + pad(i + 1), day: 1 }) })); }
  getDaysInMonth(year: number, code: string): number { const month = Number(code.slice(1)); return month === 2 ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : month >= 1 && month <= 12 ? 31 : 0; }
  addMonths(d: WklyCalendarDate, amount: number): WklyCalendarDate { integer(amount); const n = d.year * 12 + d.month - 1 + amount, month = floorMod(n, 12) + 1; return { ...d, year: floorDiv(n, 12), month, monthCode: 'M' + pad(month) }; }
  addYears(d: WklyCalendarDate, amount: number): WklyCalendarDate { return { ...d, year: d.year + integer(amount) }; }
  private format(d: WklyCalendarDate, options: Intl.DateTimeFormatOptions): string { return new Intl.DateTimeFormat(this.locale, { ...options, calendar: 'gregory', timeZone: 'UTC' } as Intl.DateTimeFormatOptions).format(new Date(gregorianDay(d.year, d.month, d.day) * 86400000)); }
  formatDay(d: WklyCalendarDate): string { return new Intl.NumberFormat(this.locale, { useGrouping: false }).format(d.day); }
  formatMonth(d: WklyCalendarDate): string { return this.format(d, { month: 'long' }); }
  formatYear(d: WklyCalendarDate): string { return new Intl.NumberFormat(this.locale, { useGrouping: false }).format(d.year); }
  formatDate(d: WklyCalendarDate): string { return this.format(d, { year: 'numeric', month: 'short', day: 'numeric' }); }
  formatAccessibleDate(d: WklyCalendarDate): string { return this.format(d, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
  formatWeekday(day: number, width: 'short' | 'long'): string { return new Intl.DateTimeFormat(this.locale, { weekday: width, timeZone: 'UTC' }).format(new Date(day * 86400000)); }
  formatWeekLabel(week: WklyWeek, mode: WklyWeekLabelMode): string {
    if (mode === 'hidden') return ''; if (mode === 'absolute-week') return String(week.absoluteWeek);
    const day = week.epochDays[0]; let start = 1, minimal = 4;
    if (mode === 'locale') { const Ctor = (Intl as any).Locale; const l = Ctor && new Ctor(this.locale); const info = l && (l.weekInfo || (l.getWeekInfo && l.getWeekInfo())); if (info) { start = info.firstDay % 7; minimal = info.minimalDays; } }
    const weekStart = (year: number) => { const jan = gregorianDay(year, 1, 1); const before = floorMod(jan + 4 - start, 7); return jan - before + (7 - before < minimal ? 7 : 0); };
    let y = gregorianDate(day).year; if (day < weekStart(y)) y--; else if (day >= weekStart(y + 1)) y++;
    return new Intl.NumberFormat(this.locale).format(floorDiv(day - weekStart(y), 7) + 1);
  }
  normalizeDigits(input: string): string { return normalizeDigits(input); }
}
export interface WklyDateTime { readonly epochDay: number; readonly hour: number; readonly minute: number; readonly second: number; }
export function decodeIso(value: string): WklyDateTime {
  const m = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.000Z$/.exec(value);
  if (!m) throw new WklyValidationException([error('malformed-iso', value)]);
  const date: WklyCalendarDate = { calendarId: 'gregory', year: +m[1], month: +m[2], monthCode: 'M' + m[2], day: +m[3] };
  const a = new WklyGregorianCalendarAdapter(); if (a.validateDate(date).length || +m[4] > 23 || +m[5] > 59 || +m[6] > 59) throw new WklyValidationException([error('malformed-iso', value)]);
  return { epochDay: a.dateToEpochDay(date), hour: +m[4], minute: +m[5], second: +m[6] };
}
export function encodeIso(value: WklyDateTime, mode: WklySelectionMode = 'datetime', showSeconds = false): string {
  const d = new WklyGregorianCalendarAdapter().epochDayToDate(mode.startsWith('time') ? -719528 : value.epochDay);
  const dateOnly = mode === 'date' || mode === 'date-range'; const h = dateOnly ? 0 : value.hour, m = dateOnly ? 0 : value.minute, s = dateOnly || !showSeconds ? 0 : value.second;
  if (![h, m, s].every(Number.isInteger) || h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) throw new WklyValidationException([error('invalid-time', value)]);
  return `${pad(d.year, 4)}-${pad(d.month)}-${pad(d.day)}T${pad(h)}:${pad(m)}:${pad(s)}.000Z`;
}
export function validateSelection(value: WklyPickerValue, config: WklySelectionConfig, adapter: WklyCalendarAdapter): readonly WklyValidationError[] {
  const errors: WklyValidationError[] = [], mode = config.mode || 'datetime';
  for (const step of [config.minuteStep === undefined ? 1 : config.minuteStep, config.secondStep === undefined ? 1 : config.secondStep]) if (!Number.isInteger(step) || step <= 0 || 60 % step !== 0) errors.push(error('configuration-error', step, 'step'));
  try { if (config.min) decodeIso(config.min); if (config.max) decodeIso(config.max); if (config.min && config.max && config.min > config.max) errors.push(error('configuration-error', config, 'min')); } catch (_) { errors.push(error('configuration-error', config, 'bounds')); }
  if (value === null) { if (config.required) errors.push(error('incomplete', value)); return errors; }
  if (typeof value !== 'string' && !Array.isArray(value)) return errors.concat(error('wrong-value-shape', value));
  if (mode.endsWith('-range') !== Array.isArray(value) || (Array.isArray(value) && value.length !== 2)) return errors.concat(error('wrong-value-shape', value));
  const values = typeof value === 'string' ? [value] : value;
  const decoded: WklyDateTime[] = [];
  values.forEach((v, index) => {
    const endpoint: WklyEndpoint = values.length === 1 ? 'single' : index === 0 ? 'start' : 'end';
    try {
      const t = decodeIso(v); decoded.push(t); const canonical = encodeIso(t, mode, config.showSeconds);
      if (canonical !== v) errors.push(error('malformed-iso', v, 'hidden-fields', endpoint));
      if (config.min && v < config.min) errors.push(error('below-minimum', v, undefined, endpoint));
      if (config.max && v > config.max) errors.push(error('above-maximum', v, undefined, endpoint));
      if (!mode.startsWith('time') && config.isDateDisabled && config.isDateDisabled(t.epochDay, { mode, endpoint, calendarDate: adapter.epochDayToDate(t.epochDay) })) errors.push(error('disabled-endpoint', v, 'date', endpoint));
      if (config.isTimeDisabled && config.isTimeDisabled(t.hour * 3600 + t.minute * 60 + t.second, { mode, endpoint })) errors.push(error('disabled-endpoint', v, 'time', endpoint));
      if (t.minute % (config.minuteStep || 1) || t.second % (config.secondStep || 1)) errors.push(error('step-mismatch', v, 'time', endpoint));
      if (!mode.startsWith('time')) adapter.epochDayToDate(t.epochDay);
    } catch (e) { errors.push(...(e instanceof WklyValidationException ? e.errors : [error('unsupported-adapter-date', v)])); }
  });
  if (decoded.length === 2 && !errors.length) {
    const pair = orderedRange(values[0], values[1], (a, b) => a.localeCompare(b));
    const a = decodeIso(pair[0]), b = decodeIso(pair[1]);
    if (!config.allowRangeAcrossDisabled) {
      let crossed = false;
      if (config.isDateDisabled && !mode.startsWith('time')) for (let d = a.epochDay; d <= b.epochDay && !crossed; d++) crossed = config.isDateDisabled(d, { mode, endpoint: 'start', calendarDate: adapter.epochDayToDate(d) });
      if (config.isTimeDisabled && !mode.startsWith('date-range') && mode !== 'date') {
        const lo = a.hour * 3600 + a.minute * 60 + a.second, hi = b.hour * 3600 + b.minute * 60 + b.second;
        const spans = a.epochDay === b.epochDay ? [[lo, hi]] : b.epochDay - a.epochDay === 1 ? [[lo, 86399], [0, hi]] : [[0, 86399]];
        for (const span of spans) for (let s = span[0]; s <= span[1] && !crossed; s++) crossed = config.isTimeDisabled(s, { mode, endpoint: 'start' });
      }
      if (crossed) errors.push(error('range-crosses-disabled', pair));
    }
    if (config.rangeValidator) { const result = config.rangeValidator(pair, mode as 'date-range'); if (result) errors.push(result); }
  }
  (config.validators || []).forEach(v => { const result = v(value); if (result) errors.push(result); });
  return errors;
}
