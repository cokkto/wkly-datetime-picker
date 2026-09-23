import { AfterViewInit, Component, ElementRef, forwardRef, Inject, LOCALE_ID, OnChanges, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { getLocaleFirstDayOfWeek, isPlatformBrowser } from '@angular/common';
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';
import { absoluteWeekOf, createWeekGenerator, firstEpochDayOf, integer, orderedRange, WklyWeek, WklyWeekGenerator, WklyWeekOffset } from 'wkly-datetime-picker.core';
import { decodeIso, encodeIso, error, resolveWeekOffset, validateSelection, WklyCalendarAdapter, WklyCalendarDate, WklyDateTime, WklyGregorianCalendarAdapter, WklyPickerValue, WklyValidationError, WklyValidationException } from 'wkly-datetime-picker.adapters';
import { coerceBoolean, ENGLISH, TRANSLATIONS, WKLY_CLOCK, WKLY_CONFIG, WKLY_LOCALIZATION, WklyClock, WklyCloseReason, WklyConfiguration, WklyJumpOptions, WklyPickerInputs, WklyStrings } from './config';
declare class ResizeObserver { constructor(callback: () => void); observe(element: Element): void; disconnect(): void; }
interface Draft { date: WklyCalendarDate; hour: number | null; minute: number | null; second: number | null; present: boolean; }
interface DayCell { epochDay: number; date: WklyCalendarDate | null; label: string; accessible: string; annotation: string; hidden: boolean; disabled: boolean; }
interface Row { week: WklyWeek; label: string; cells: DayCell[]; }
@Component({
  selector: 'wkly-datetime-picker', templateUrl: './picker.component.html', styleUrls: ['./picker.component.css'],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => WklyDateTimePickerComponent), multi: true }, { provide: NG_VALIDATORS, useExisting: forwardRef(() => WklyDateTimePickerComponent), multi: true }]
})
export class WklyDateTimePickerComponent extends WklyPickerInputs implements OnInit, OnChanges, AfterViewInit, OnDestroy, ControlValueAccessor, Validator {
  @ViewChild('scroller') scroller?: ElementRef<HTMLElement>;
  presentation: 'inline' | 'transient' = 'inline'; viewMode: 'calendar' | 'manual' = 'calendar';
  adapter!: WklyCalendarAdapter; effectiveLocale = 'en-US'; effectiveOffset: WklyWeekOffset = 0; effectiveHourCycle: 'h12' | 'h24' = 'h24'; direction = 'ltr';
  rows: Row[] = []; weekdays: string[] = []; drafts: Draft[] = []; errors: readonly WklyValidationError[] = []; today = 0; focused = 0; anchorWeek = 0; firstWeek = 0; visibleCount = 6;
  rowHeight = 76; scrollHeight = 152076; paddingTop = 0; initialized = false; compact = false;
  private baseWeek = 0; private generator!: WklyWeekGenerator; private initialMonth = ''; private clipMonth = false; private browser = false; private observer?: ResizeObserver;
  private onChange: (value: WklyPickerValue) => void = () => {}; private onTouched: () => void = () => {}; private validatorChanged: () => void = () => {};
  private configErrors: WklyValidationError[] = []; private pendingValue: WklyPickerValue = null;
  private emittedValue: string | null = null;
  constructor(@Inject(LOCALE_ID) private defaultLocale: string, @Inject(WKLY_CONFIG) private defaults: WklyConfiguration, @Inject(WKLY_CLOCK) private clock: WklyClock, @Inject(WKLY_LOCALIZATION) private strings: WklyStrings, @Inject(PLATFORM_ID) platform: Object, private host: ElementRef<HTMLElement>) { super(); this.browser = isPlatformBrowser(platform); }
  ngOnInit(): void { this.initialize(); }
  ngOnChanges(changes: any): void { if (this.initialized) { if (Object.keys(changes).length === 1 && changes.value && this.emittedValue === JSON.stringify(this.value)) { this.emittedValue = null; return; } const focus = this.focused; this.configure(); if (changes.value || changes.mode || changes.calendarAdapter) { this.load(this.value); this.position(this.focused, true); } else { this.check(); if (changes.viewportPreset) this.position(focus, true); else this.scrollToEpochDay(focus); } } }
  initialize(): void {
    if (this.initialized) return; this.configure();
    this.today = this.browser ? Math.floor(this.clock.now().getTime() / 86400000) : (this.initialEpochDay === null ? 0 : this.initialEpochDay);
    this.focused = this.initialEpochDay === null ? this.defaults.initialEpochDay === undefined ? this.today : this.defaults.initialEpochDay : this.initialEpochDay;
    this.load(this.value); this.initialized = true; this.position(this.focused, true);
  }
  configure(): void {
    this.configErrors = [];
    ['showSeconds', 'allowRangeAcrossDisabled', 'required', 'disabled', 'closeOnBackdrop'].forEach(key => (this as any)[key] = coerceBoolean((this as any)[key]));
    this.effectiveLocale = this.locale || this.defaults.locale || this.defaultLocale;
    this.direction = /^(ar|he|fa|ur)(-|$)/.test(this.effectiveLocale) ? 'rtl' : 'ltr';
    this.adapter = this.calendarAdapter || new WklyGregorianCalendarAdapter(this.effectiveLocale);
    try {
      let firstDay: number | undefined; try { firstDay = getLocaleFirstDayOfWeek(this.effectiveLocale); } catch (_) {}
      this.effectiveOffset = resolveWeekOffset(this.effectiveLocale, this.weekOffset, this.defaults.weekOffset, firstDay);
      integer(this.weekCacheSize); integer(this.overscanWeeks); if (this.weekCacheSize < 0 || this.overscanWeeks < 0 || this.overscanWeeks > 50) throw new RangeError();
      if (!['datetime', 'date', 'time', 'datetime-range', 'date-range', 'time-range'].includes(this.mode)) throw new RangeError();
      const preset = this.viewportPreset;
      if (preset.kind === 'weeks') { integer(preset.visibleWeekCount); if (preset.visibleWeekCount < 1 || preset.visibleWeekCount > 52) throw new RangeError(); }
      if (preset.kind === 'full-month-and-around') for (const n of [preset.extraWeeksBefore || 0, preset.extraWeeksAfter || 0]) { integer(n); if (n < 0 || n > 52) throw new RangeError(); }
      this.generator = createWeekGenerator({ weekOffset: this.effectiveOffset, cacheSize: this.weekCacheSize });
    } catch (_) { this.configErrors.push(error('configuration-error', this.weekOffset)); this.generator = createWeekGenerator(); this.effectiveOffset = 0; }
    this.effectiveHourCycle = this.hourCycle === 'h12' ? 'h12' : this.hourCycle === 'locale' ? (new Intl.DateTimeFormat(this.effectiveLocale, { hour: 'numeric', timeZone: 'UTC' }).resolvedOptions().hour12 ? 'h12' : 'h24') : 'h24';
    this.weekdays = Array.from({ length: 7 }, (_, i) => this.adapter.formatWeekday(this.effectiveOffset + i, 'short'));
  }
  ngAfterViewInit(): void { this.resetScroll(); if (this.browser && typeof ResizeObserver !== 'undefined') { this.observer = new ResizeObserver(() => { this.compact = this.host.nativeElement.clientWidth < 338; const row = this.host.nativeElement.querySelector('.week-row') as HTMLElement; if (row && row.offsetHeight && row.offsetHeight !== this.rowHeight) { this.rowHeight = row.offsetHeight; this.scrollHeight = this.rowHeight * 2001; this.renderRows(); this.resetScroll(); } }); this.observer.observe(this.host.nativeElement); } }
  ngOnDestroy(): void { if (this.observer) this.observer.disconnect(); if (this.generator) this.generator.clearCache(); }
  t(key: string): string { return this.strings[key] || (TRANSLATIONS[this.effectiveLocale.split('-')[0]] || {})[key] || ENGLISH[key] || key; }
  get isRange(): boolean { return this.mode.endsWith('-range'); }
  get hasDate(): boolean { return !this.mode.startsWith('time'); }
  get hasTime(): boolean { return this.mode !== 'date' && this.mode !== 'date-range'; }
  get submitVisible(): boolean { return this.presentation === 'transient' && (this.mode !== 'date' || this.viewMode === 'manual'); }
  get title(): string { try { const d = this.adapter.epochDayToDate(Math.max(this.adapter.supportedEpochDayRange[0], Math.min(this.adapter.supportedEpochDayRange[1], firstEpochDayOf(this.anchorWeek, this.effectiveOffset)))); return this.adapter.formatMonth(d) + ' ' + this.adapter.formatYear(d); } catch (_) { return ''; } }
  get canSubmit(): boolean { return !this.disabled && !this.errors.length && this.pendingValue !== null; }
  private blank(day: number): Draft { const safe = Math.max(this.adapter.supportedEpochDayRange[0], Math.min(this.adapter.supportedEpochDayRange[1], day)); return { date: this.adapter.epochDayToDate(safe), hour: 0, minute: 0, second: 0, present: false }; }
  load(value: WklyPickerValue): void {
    this.drafts = [this.blank(this.focused), this.blank(this.focused)];
    const validation = validateSelection(value, this, this.adapter);
    if (value !== null && !validation.length) {
      const values = typeof value === 'string' ? [value] : value;
      values.forEach((v, i) => { const d = decodeIso(v); this.drafts[i] = { date: this.hasDate ? this.adapter.epochDayToDate(d.epochDay) : this.blank(this.today).date, hour: d.hour, minute: d.minute, second: d.second, present: true }; if (i === 0 && this.hasDate) this.focused = d.epochDay; });
    }
    if (validation.length) { this.pendingValue = null; this.report(validation); } else this.check();
  }
  writeValue(value: WklyPickerValue): void { this.value = value; if (this.initialized) { this.load(value); this.position(this.focused, true); } }
  registerOnChange(fn: (value: WklyPickerValue) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }
  validate(_control: AbstractControl): ValidationErrors | null { return this.errors.length ? { wkly: this.errors } : null; }
  registerOnValidatorChange(fn: () => void): void { this.validatorChanged = fn; }
  touched(): void { Promise.resolve().then(() => this.onTouched()); }
  private report(errors: readonly WklyValidationError[]): void { const changed = JSON.stringify(this.errors) !== JSON.stringify(errors); this.errors = errors; if (changed) { this.validationChange.emit(errors); this.validatorChanged(); } }
  check(): void {
    const errors: WklyValidationError[] = this.configErrors.slice(); const values: string[] = [];
    this.drafts.slice(0, this.isRange ? 2 : 1).forEach((draft, index) => {
      const endpoint = this.isRange ? index === 0 ? 'start' : 'end' : 'single';
      if (!draft.present) { if (this.required || this.drafts.some(d => d.present)) errors.push(error('incomplete', draft, undefined, endpoint)); return; }
      if (this.hasDate) for (const e of this.adapter.validateDate(draft.date)) errors.push(error(e.code as any, draft.date, e.field, endpoint));
      if (this.hasDate && [draft.date.day, draft.date.month, draft.date.year].some(v => v === null || Number.isNaN(v))) errors.push(error('incomplete', draft.date, 'date', endpoint));
      if (this.hasTime && [draft.hour, draft.minute, this.showSeconds ? draft.second : 0].some(v => v === null)) errors.push(error('incomplete', draft, 'time', endpoint));
      if (!errors.length) try { values.push(encodeIso({ epochDay: this.hasDate ? this.adapter.dateToEpochDay(draft.date) : -719528, hour: draft.hour!, minute: draft.minute!, second: draft.second! }, this.mode, this.showSeconds)); } catch (e) { errors.push(...(e instanceof WklyValidationException ? e.errors : [error('invalid-calendar-date', draft)])); }
    });
    let value: WklyPickerValue = null;
    if (values.length === (this.isRange ? 2 : 1)) value = this.isRange ? orderedRange(values[0], values[1], (a, b) => a.localeCompare(b)) : values[0];
    errors.push(...validateSelection(value, this, this.adapter)); this.pendingValue = errors.length ? null : value; this.report(errors);
  }
  finish(): void { if (this.disabled) return; this.check(); if (this.presentation === 'inline' && this.canSubmit) this.commit(); }
  private commit(): void { if (!this.canSubmit) return; const next = this.pendingValue; if (JSON.stringify(next) !== JSON.stringify(this.value)) { this.value = next; this.emittedValue = JSON.stringify(next); this.onChange(next); this.valueChange.emit(next); } this.onTouched(); }
  submit(reason: WklyCloseReason = 'submit'): void { this.check(); if (!this.canSubmit) return; this.commit(); if (this.presentation === 'transient') this.closed.emit(reason); }
  cancel(reason: WklyCloseReason = 'close-button'): void { if (this.disabled) return; this.load(this.value); this.onTouched(); this.closed.emit(reason); }
  now(): void {
    if (this.disabled) return; const n = this.clock.now(); const day = Math.floor(n.getTime() / 86400000);
    this.drafts = [0, 1].map(() => ({ date: this.blank(day).date, hour: n.getUTCHours(), minute: Math.floor(n.getUTCMinutes() / this.minuteStep) * this.minuteStep, second: this.showSeconds ? Math.floor(n.getUTCSeconds() / this.secondStep) * this.secondStep : 0, present: true }));
    if (this.hasDate && (day < this.adapter.supportedEpochDayRange[0] || day > this.adapter.supportedEpochDayRange[1])) { this.report([error('unsupported-adapter-date', day)]); return; }
    this.focused = day; this.position(day, true); this.check(); this.submit('now');
  }
  toggleView(year = false): void { if (this.disabled || !this.hasDate) return; this.viewMode = year ? 'manual' : this.viewMode === 'calendar' ? 'manual' : 'calendar'; this.viewModeChange.emit(this.viewMode); if (this.viewMode === 'calendar') setTimeout(() => this.resetScroll()); if (year && this.browser) setTimeout(() => { const field = this.host.nativeElement.querySelector('input[aria-label="' + this.t('year') + '"]') as HTMLInputElement; if (field) { field.focus(); field.select(); } }); }
  months(draft: Draft): readonly string[] { try { return this.adapter.getMonths(draft.date.year).map(m => m.label); } catch (_) { return []; } }
  monthCount(draft: Draft): number { return this.months(draft).length || 12; }
  field(index: number, field: string, value: number | null): void {
    if (this.disabled) return; const draft = this.drafts[index]; draft.present = true;
    if (field === 'day' || field === 'year' || field === 'month') {
      let date = { ...draft.date, [field]: value } as WklyCalendarDate;
      if (field === 'month') { let month; try { month = this.adapter.getMonths(date.year).find(m => m.month === value); } catch (_) {} date = { ...date, monthCode: month ? month.monthCode : '' }; }
      if (field === 'year' && value !== null) { try { const months = this.adapter.getMonths(value); const month = months.find(m => m.monthCode === date.monthCode); if (month) date = { ...date, month: month.month }; } catch (_) {} }
      draft.date = date;
    } else if (field === 'hour' && this.effectiveHourCycle === 'h12') draft.hour = value === null ? null : value >= 1 && value <= 12 ? value % 12 + ((draft.hour || 0) >= 12 ? 12 : 0) : 24 + value;
    else (draft as any)[field] = value;
    this.check();
  }
  displayHour(draft: Draft): number | null { return draft.hour === null ? null : this.effectiveHourCycle === 'h12' ? draft.hour % 12 || 12 : draft.hour; }
  period(index: number, period: 'am' | 'pm' | '24'): void { if (this.disabled) return; if (period === '24') this.effectiveHourCycle = 'h24'; else { this.effectiveHourCycle = 'h12'; this.drafts[index].hour = (this.drafts[index].hour || 0) % 12 + (period === 'pm' ? 12 : 0); this.drafts[index].present = true; this.finish(); } }
  selected(day: number): boolean { return this.drafts.some(d => { try { return d.present && this.adapter.dateToEpochDay(d.date) === day; } catch (_) { return false; } }); }
  inRange(day: number): boolean { if (!this.isRange || !this.drafts.every(d => d.present)) return false; try { const a = this.adapter.dateToEpochDay(this.drafts[0].date), b = this.adapter.dateToEpochDay(this.drafts[1].date); return day > Math.min(a, b) && day < Math.max(a, b); } catch (_) { return false; } }
  dayDisabled(day: number): boolean {
    try { const date = this.adapter.epochDayToDate(day); if (this.isDateDisabled && this.isDateDisabled(day, { mode: this.mode, endpoint: this.isRange ? this.drafts[0]?.present && !this.drafts[1]?.present ? 'end' : 'start' : 'single', calendarDate: date })) return true;
      if (this.min && day < decodeIso(this.min).epochDay) return true; if (this.max && day > decodeIso(this.max).epochDay) return true; return false;
    } catch (_) { return true; }
  }
  select(day: number): void {
    if (this.disabled || this.dayDisabled(day)) return; this.focused = day;
    const index = this.isRange && this.drafts[0].present && !this.drafts[1].present ? 1 : 0;
    if (this.isRange && index === 0) this.drafts[1].present = false;
    this.drafts[index].date = this.adapter.epochDayToDate(day); this.drafts[index].present = true;
    if (this.isRange && this.drafts[1].present) { const a = this.drafts[0], b = this.drafts[1]; const key = (d: Draft) => this.adapter.dateToEpochDay(d.date) * 86400 + (d.hour || 0) * 3600 + (d.minute || 0) * 60 + (d.second || 0); if (key(a) > key(b)) this.drafts = [b, a]; }
    this.renderRows(); this.finish(); if (this.presentation === 'transient' && this.mode === 'date' && this.viewMode === 'calendar') this.submit('auto-submit');
  }
  key(event: KeyboardEvent, day: number): void {
    let delta = 0;
    if (event.key === 'ArrowLeft') delta = -1; if (event.key === 'ArrowRight') delta = 1; if (event.key === 'ArrowUp') delta = -7; if (event.key === 'ArrowDown') delta = 7;
    if (event.key === 'PageUp') delta = -7 * (event.shiftKey ? this.visibleCount : 1); if (event.key === 'PageDown') delta = 7 * (event.shiftKey ? this.visibleCount : 1);
    if (event.key === 'Home') { event.preventDefault(); this.scrollToEpochDay(this.today, { focus: true }); }
    if (delta) { event.preventDefault(); const target = day + delta; if (target >= this.adapter.supportedEpochDayRange[0] && target <= this.adapter.supportedEpochDayRange[1]) this.scrollToEpochDay(target, { focus: true }); }
  }
  private position(day: number, preset = false, options: WklyJumpOptions = {}): void {
    day = Math.max(this.adapter.supportedEpochDayRange[0], Math.min(this.adapter.supportedEpochDayRange[1], day)); this.anchorWeek = absoluteWeekOf(day, this.effectiveOffset); this.clipMonth = preset && this.viewportPreset.kind === 'full-month';
    if (preset && this.viewportPreset.kind !== 'weeks') {
      const d = this.adapter.epochDayToDate(day); this.initialMonth = d.year + '/' + d.monthCode;
      const start = this.adapter.dateToEpochDay({ ...d, day: 1 }), end = start + this.adapter.getDaysInMonth(d.year, d.monthCode) - 1;
      this.firstWeek = absoluteWeekOf(start, this.effectiveOffset); this.visibleCount = absoluteWeekOf(end, this.effectiveOffset) - this.firstWeek + 1;
      if (this.viewportPreset.kind === 'full-month-and-around' && !this.configErrors.length) { const before = this.viewportPreset.extraWeeksBefore || 0, after = this.viewportPreset.extraWeeksAfter || 0; this.firstWeek -= before; this.visibleCount += before + after; }
    } else { if (this.viewportPreset.kind === 'weeks') this.visibleCount = this.configErrors.length ? 6 : this.viewportPreset.visibleWeekCount; this.firstWeek = this.anchorWeek - (options.align === 'start' ? 0 : options.align === 'end' ? this.visibleCount - 1 : Math.floor(this.visibleCount / 2)); }
    this.baseWeek = this.firstWeek - 1000; this.renderRows(); this.resetScroll();
  }
  private resetScroll(): void { if (this.scroller) this.scroller.nativeElement.scrollTop = 1000 * this.rowHeight; }
  scroll(event: Event): void {
    const element = event.target as HTMLElement; const index = Math.floor(element.scrollTop / this.rowHeight); const first = this.baseWeek + index;
    if (first === this.firstWeek) return; this.clipMonth = false; this.firstWeek = first; this.anchorWeek = first + Math.floor(this.visibleCount / 2);
    if (index < 100 || index > 1900) { this.baseWeek = first - 1000; element.scrollTop = 1000 * this.rowHeight + element.scrollTop % this.rowHeight; }
    this.renderRows();
  }
  moveWeek(delta: number): void { if (!this.disabled) this.scrollToAbsoluteWeek(this.anchorWeek + delta); }
  private renderRows(): void {
    const overscan = Math.max(0, Math.min(50, this.overscanWeeks || 0)); const start = this.firstWeek - overscan;
    this.paddingTop = (start - this.baseWeek) * this.rowHeight;
    this.rows = Array.from({ length: this.visibleCount + 2 * overscan }, (_, i) => {
      const week = this.generator.getWeek(start + i); return { week, label: this.weekLabelFormatter ? this.weekLabelFormatter(week, this.adapter) : this.adapter.formatWeekLabel(week, this.weekLabelMode), cells: week.epochDays.map((epochDay, j) => {
        let date: WklyCalendarDate | null = null; try { date = this.adapter.epochDayToDate(epochDay); } catch (_) {}
        const hidden = !date || (this.clipMonth && date.year + '/' + date.monthCode !== this.initialMonth);
        return { epochDay, date, hidden, disabled: this.dayDisabled(epochDay), label: date ? this.adapter.formatDay(date) : '', accessible: date ? this.adapter.formatAccessibleDate(date) : '', annotation: date && !hidden && (date.day === 1 || (week.absoluteWeek === this.firstWeek && j === 0)) ? this.adapter.formatMonth(date) + ' ' + this.adapter.formatYear(date) : '' };
      }) };
    });
    this.viewportChange.emit({ firstVisibleAbsoluteWeek: this.firstWeek, lastVisibleAbsoluteWeek: this.firstWeek + this.visibleCount - 1, anchorAbsoluteWeek: this.anchorWeek });
  }
  trackRow(_i: number, row: Row): number { return row.week.absoluteWeek; }
  scrollToEpochDay(day: number, options: WklyJumpOptions = {}): void { integer(day); this.adapter.epochDayToDate(day); this.position(day, false, options); if (options.select) this.select(day); if (options.focus) { this.focused = day; this.focusDay(); } }
  scrollToAbsoluteWeek(week: number, options: WklyJumpOptions = {}): void { this.scrollToEpochDay(firstEpochDayOf(week, this.effectiveOffset), options); }
  scrollToCalendarDate(date: WklyCalendarDate, options: WklyJumpOptions = {}): void { this.scrollToEpochDay(this.adapter.dateToEpochDay(date), options); }
  scrollToValue(value: string, options: WklyJumpOptions = {}): void { this.scrollToEpochDay(decodeIso(value).epochDay, options); }
  focusDay(): void { if (!this.browser) return; setTimeout(() => { const day = this.host.nativeElement.querySelector('[data-day="' + this.focused + '"]') as HTMLElement; const fallback = this.host.nativeElement.querySelector('button:not(:disabled),input:not(:disabled)') as HTMLElement; (day || fallback)?.focus({ preventScroll: true }); }); }
}
