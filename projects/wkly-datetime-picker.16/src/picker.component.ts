import {
  AfterViewInit,
  Component,
  ElementRef,
  forwardRef,
  Inject,
  LOCALE_ID,
  OnChanges,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from "@angular/core";
import { getLocaleFirstDayOfWeek, isPlatformBrowser } from "@angular/common";
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from "@angular/forms";
import {
  absoluteWeekOf,
  createWeekGenerator,
  firstEpochDayOf,
  integer,
  WklyWeekGenerator,
  WklyWeekOffset,
} from "wkly-datetime-picker.core";
import {
  decodeIso,
  error,
  resolveWeekOffset,
  validateSelection,
  WklyCalendarAdapter,
  WklyCalendarDate,
  WklyDateTime,
  WklyGregorianCalendarAdapter,
  WklyPickerValue,
  WklyValidationError,
} from "wkly-datetime-picker.adapters";
import {
  createWeekRows,
  validateDrafts,
  WklyDraft as Draft,
  WklyWeekRow as Row,
} from "wkly-datetime-picker";
import {
  coerceBoolean,
  ENGLISH,
  WKLY_CLOCK,
  WKLY_CONFIG,
  WKLY_LOCALIZATION,
  WKLY_TRANSLATIONS,
  WklyClock,
  WklyCloseReason,
  WklyConfiguration,
  WklyJumpOptions,
  WklyPickerInputs,
  WklyPickerInputsPropertyKeys,
  WklyPickerOutputsPropertyKeys,
  WklyStrings,
  WklyTranslations,
} from "./config";
declare class ResizeObserver {
  constructor(callback: () => void);
  observe(element: Element): void;
  disconnect(): void;
}
@Component({
  selector: "wkly-datetime-picker",
  templateUrl: "./picker.component.html",
  styleUrls: ["../../wkly-datetime-picker/src/picker.component.css"],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => WklyDateTimePickerComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => WklyDateTimePickerComponent),
      multi: true,
    },
  ],
})
export class WklyDateTimePickerComponent
  extends WklyPickerInputs
  implements
    OnInit,
    OnChanges,
    AfterViewInit,
    OnDestroy,
    ControlValueAccessor,
    Validator
{
  @ViewChild("scroller") scroller?: ElementRef<HTMLElement>;
  presentation: "inline" | "transient" = "inline";
  viewMode: "calendar" | "manual" = "calendar";
  adapter!: WklyCalendarAdapter;
  effectiveLocale = "en-US";
  effectiveOffset: WklyWeekOffset = 0;
  effectiveHourCycle: "h12" | "h24" = "h24";
  direction = "ltr";
  rows: Row[] = [];
  weekdays: string[] = [];
  drafts: Draft[] = [];
  errors: readonly WklyValidationError[] = [];
  today = 0;
  focused = 0;
  anchorWeek = 0;
  firstWeek = 0;
  visibleCount = 6;
  rowHeight = 76;
  scrollHeight = 152076;
  paddingTop = 0;
  initialized = false;
  compact = false;
  readonly WklyPickerInputsPropertyKeys = WklyPickerInputsPropertyKeys;
  private baseWeek = 0;
  private firstSupportedDay = 0;
  private lastSupportedDay = 0;
  private firstSupportedWeek = 0;
  private lastSupportedWeek = 0;
  private generator!: WklyWeekGenerator;
  private initialMonth = "";
  private clipMonth = false;
  private browser = false;
  private observer?: ResizeObserver;
  private scrollEndTimer?: ReturnType<typeof setTimeout>;
  private snapPending = false;
  private onChange: (value: WklyPickerValue) => void = () => {};
  private onTouched: () => void = () => {};
  private validatorChanged: () => void = () => {};
  private configErrors: WklyValidationError[] = [];
  private pendingValue: WklyPickerValue = null;
  private emittedValue: string | null = null;
  private manualDateEndpoint = 0;
  constructor(
    @Inject(LOCALE_ID) private defaultLocale: string,
    @Inject(WKLY_CONFIG) private defaults: WklyConfiguration,
    @Inject(WKLY_CLOCK) private clock: WklyClock,
    @Inject(WKLY_LOCALIZATION) private strings: WklyStrings,
    @Inject(WKLY_TRANSLATIONS) private defaultTranslations: WklyTranslations,
    @Inject(PLATFORM_ID) platform: Object,
    private host: ElementRef<HTMLElement>,
  ) {
    super();
    this.browser = isPlatformBrowser(platform);
  }
  ngOnInit(): void {
    this.initialize();
  }
  ngOnChanges(changes: any): void {
    if (this.initialized) {
      if (
        Object.keys(changes).length === 1 &&
        changes[WklyPickerInputsPropertyKeys.Value] &&
        this.emittedValue ===
          JSON.stringify(this[WklyPickerInputsPropertyKeys.Value])
      ) {
        this.emittedValue = null;
        return;
      }
      const focus = this.focused;
      this.configure();
      if (
        changes[WklyPickerInputsPropertyKeys.Value] ||
        changes[WklyPickerInputsPropertyKeys.Mode] ||
        changes[WklyPickerInputsPropertyKeys.CalendarAdapter]
      ) {
        this.load(this[WklyPickerInputsPropertyKeys.Value]);
        this.position(this.focused, true);
      } else {
        this.check();
        if (changes[WklyPickerInputsPropertyKeys.ViewportPreset])
          this.position(focus, true);
        else this.scrollToEpochDay(focus);
      }
    }
  }
  initialize(): void {
    if (this.initialized) return;
    this.configure();
    const initialEpochDay = this[WklyPickerInputsPropertyKeys.InitialEpochDay];
    this.today = this.browser
      ? Math.floor(this.clock.now().getTime() / 86400000)
      : initialEpochDay === null
        ? 0
        : initialEpochDay;
    this.focused =
      initialEpochDay === null
        ? this.defaults.initialEpochDay === undefined
          ? this.today
          : this.defaults.initialEpochDay
        : initialEpochDay;
    this.load(this[WklyPickerInputsPropertyKeys.Value]);
    this.initialized = true;
    this.position(this.focused, true);
  }
  configure(): void {
    this.configErrors = [];
    [
      WklyPickerInputsPropertyKeys.ShowSeconds,
      WklyPickerInputsPropertyKeys.AllowRangeAcrossDisabled,
      WklyPickerInputsPropertyKeys.Required,
      WklyPickerInputsPropertyKeys.Disabled,
      WklyPickerInputsPropertyKeys.CloseOnBackdrop,
    ].forEach(
      (key) => ((this as any)[key] = coerceBoolean((this as any)[key])),
    );
    this.effectiveLocale =
      this[WklyPickerInputsPropertyKeys.Locale] ||
      this.defaults.locale ||
      this.defaultLocale;
    this.direction = /^(ar|he|fa|ur)(-|$)/.test(this.effectiveLocale)
      ? "rtl"
      : "ltr";
    this.adapter =
      this[WklyPickerInputsPropertyKeys.CalendarAdapter] ||
      new WklyGregorianCalendarAdapter(this.effectiveLocale);
    try {
      let firstDay: number | undefined;
      try {
        firstDay = getLocaleFirstDayOfWeek(this.effectiveLocale);
      } catch (_) {}
      this.effectiveOffset = resolveWeekOffset(
        this.effectiveLocale,
        this[WklyPickerInputsPropertyKeys.WeekOffset],
        this.defaults.weekOffset,
        firstDay,
      );
      integer(this[WklyPickerInputsPropertyKeys.WeekCacheSize]);
      integer(this[WklyPickerInputsPropertyKeys.OverscanWeeks]);
      if (
        this[WklyPickerInputsPropertyKeys.WeekCacheSize] < 0 ||
        this[WklyPickerInputsPropertyKeys.OverscanWeeks] < 0 ||
        this[WklyPickerInputsPropertyKeys.OverscanWeeks] > 50
      )
        throw new RangeError();
      if (
        ![
          "datetime",
          "date",
          "time",
          "datetime-range",
          "date-range",
          "time-range",
        ].includes(this[WklyPickerInputsPropertyKeys.Mode])
      )
        throw new RangeError();
      const preset = this[WklyPickerInputsPropertyKeys.ViewportPreset];
      if (preset.kind === "weeks") {
        integer(preset.visibleWeekCount);
        if (preset.visibleWeekCount < 1 || preset.visibleWeekCount > 52)
          throw new RangeError();
      }
      if (preset.kind === "full-month-and-around")
        for (const n of [
          preset.extraWeeksBefore || 0,
          preset.extraWeeksAfter || 0,
        ]) {
          integer(n);
          if (n < 0 || n > 52) throw new RangeError();
        }
      this.generator = createWeekGenerator({
        weekOffset: this.effectiveOffset,
        cacheSize: this[WklyPickerInputsPropertyKeys.WeekCacheSize],
      });
    } catch (_) {
      this.configErrors.push(
        error(
          "configuration-error",
          this[WklyPickerInputsPropertyKeys.WeekOffset],
        ),
      );
      this.generator = createWeekGenerator();
      this.effectiveOffset = 0;
    }
    this.setSupportedScrollRange();
    this.effectiveHourCycle =
      this[WklyPickerInputsPropertyKeys.HourCycle] === "h12"
        ? "h12"
        : this[WklyPickerInputsPropertyKeys.HourCycle] === "locale"
          ? new Intl.DateTimeFormat(this.effectiveLocale, {
              hour: "numeric",
              timeZone: "UTC",
            }).resolvedOptions().hour12
            ? "h12"
            : "h24"
          : "h24";
    this.weekdays = Array.from({ length: 7 }, (_, i) =>
      this.adapter.formatWeekday(this.effectiveOffset + i, "short"),
    );
  }
  private setSupportedScrollRange(): void {
    let [first, last] = this.adapter.supportedEpochDayRange;
    const [firstYear, lastYear] = this.adapter.supportedYearRange;
    const yearOf = (day: number) => this.adapter.epochDayToDate(day).year;
    if (yearOf(first) < firstYear) {
      let low = first,
        high = last;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (yearOf(mid) < firstYear) low = mid + 1;
        else high = mid;
      }
      first = low;
    }
    if (yearOf(last) > lastYear) {
      let low = first,
        high = last;
      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (yearOf(mid) > lastYear) high = mid - 1;
        else low = mid;
      }
      last = low;
    }
    if (
      first > last ||
      yearOf(first) < firstYear ||
      yearOf(first) > lastYear ||
      yearOf(last) < firstYear ||
      yearOf(last) > lastYear
    )
      throw new RangeError("No supported days within the calendar year range");
    this.firstSupportedDay = first;
    this.lastSupportedDay = last;
    this.firstSupportedWeek = absoluteWeekOf(first, this.effectiveOffset);
    this.lastSupportedWeek = absoluteWeekOf(last, this.effectiveOffset);
  }
  private clampFirstWeek(week: number): number {
    // Keep supported weeks inside the viewport; renderRows adds the buffer rows.
    const last = Math.max(
      this.firstSupportedWeek,
      this.lastSupportedWeek - this.visibleCount + 1,
    );
    return Math.max(this.firstSupportedWeek, Math.min(last, week));
  }
  ngAfterViewInit(): void {
    this.resetScroll();
    if (this.browser && typeof ResizeObserver !== "undefined") {
      this.observer = new ResizeObserver(() => {
        this.compact = this.host.nativeElement.clientWidth < 338;
        const row = this.host.nativeElement.querySelector(
          ".week-row",
        ) as HTMLElement;
        // CSS heights and scrollTop use layout pixels; client rectangles include zoom.
        const height = row ? parseFloat(getComputedStyle(row).height) : 0;
        if (height && height !== this.rowHeight) {
          this.rowHeight = height;
          this.scrollHeight = this.rowHeight * 2001;
          this.renderRows();
          this.resetScroll();
        }
      });
      this.observer.observe(this.host.nativeElement);
    }
  }
  ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
    if (this.scrollEndTimer) clearTimeout(this.scrollEndTimer);
    if (this.generator) this.generator.clearCache();
  }
  t(key: string): string {
    return (
      this.strings[key] ||
      ((this[WklyPickerInputsPropertyKeys.Translations] ||
        this.defaultTranslations)[this.effectiveLocale.split("-")[0]] || {})[
        key
      ] ||
      ENGLISH[key] ||
      key
    );
  }
  get isRange(): boolean {
    return this[WklyPickerInputsPropertyKeys.Mode].endsWith("-range");
  }
  get hasDate(): boolean {
    return !this[WklyPickerInputsPropertyKeys.Mode].startsWith("time");
  }
  get hasTime(): boolean {
    return (
      this[WklyPickerInputsPropertyKeys.Mode] !== "date" &&
      this[WklyPickerInputsPropertyKeys.Mode] !== "date-range"
    );
  }
  get submitVisible(): boolean {
    return (
      this.presentation === "transient" &&
      (this[WklyPickerInputsPropertyKeys.Mode] !== "date" ||
        this.viewMode === "manual")
    );
  }
  get title(): string {
    try {
      const d = this.adapter.epochDayToDate(
        Math.max(
          this.firstSupportedDay,
          Math.min(
            this.lastSupportedDay,
            firstEpochDayOf(this.anchorWeek, this.effectiveOffset),
          ),
        ),
      );
      return this.adapter.formatMonth(d) + " " + this.adapter.formatYear(d);
    } catch (_) {
      return "";
    }
  }
  get canSubmit(): boolean {
    return (
      !this[WklyPickerInputsPropertyKeys.Disabled] &&
      !this.errors.length &&
      this.pendingValue !== null
    );
  }
  private blank(day: number): Draft {
    const safe = Math.max(
      this.firstSupportedDay,
      Math.min(this.lastSupportedDay, day),
    );
    return {
      date: this.adapter.epochDayToDate(safe),
      hour: 0,
      minute: 0,
      second: 0,
      present: false,
    };
  }
  load(value: WklyPickerValue): void {
    this.drafts = [this.blank(this.focused), this.blank(this.focused)];
    const validation = validateSelection(value, this, this.adapter);
    if (value !== null && !validation.length) {
      const values = typeof value === "string" ? [value] : value;
      values.forEach((v, i) => {
        const d = decodeIso(v);
        this.drafts[i] = {
          date: this.hasDate
            ? this.adapter.epochDayToDate(d.epochDay)
            : this.blank(this.today).date,
          hour: d.hour,
          minute: d.minute,
          second: d.second,
          present: true,
        };
        if (i === 0 && this.hasDate) this.focused = d.epochDay;
      });
    }
    if (validation.length) {
      this.pendingValue = null;
      this.report(validation);
    } else this.check();
  }
  writeValue(value: WklyPickerValue): void {
    this[WklyPickerInputsPropertyKeys.Value] = value;
    if (this.initialized) {
      this.load(value);
      this.position(this.focused, true);
    }
  }
  registerOnChange(fn: (value: WklyPickerValue) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this[WklyPickerInputsPropertyKeys.Disabled] = disabled;
  }
  validate(_control: AbstractControl): ValidationErrors | null {
    return this.errors.length ? { wkly: this.errors } : null;
  }
  registerOnValidatorChange(fn: () => void): void {
    this.validatorChanged = fn;
  }
  touched(): void {
    Promise.resolve().then(() => this.onTouched());
  }
  private report(errors: readonly WklyValidationError[]): void {
    const changed = JSON.stringify(this.errors) !== JSON.stringify(errors);
    this.errors = errors;
    if (changed) {
      this[WklyPickerOutputsPropertyKeys.ValidationChange].emit(errors);
      this.validatorChanged();
    }
  }
  check(): void {
    const result = validateDrafts({
      drafts: this.drafts,
      configErrors: this.configErrors,
      adapter: this.adapter,
      selection: this,
      mode: this[WklyPickerInputsPropertyKeys.Mode],
      isRange: this.isRange,
      hasDate: this.hasDate,
      hasTime: this.hasTime,
      showSeconds: this[WklyPickerInputsPropertyKeys.ShowSeconds],
      required: this[WklyPickerInputsPropertyKeys.Required],
    });
    this.pendingValue = result.pendingValue;
    this.report(result.errors);
  }
  finish(): void {
    if (this[WklyPickerInputsPropertyKeys.Disabled]) return;
    if (this.viewMode === "manual" && this.hasDate) this.positionOnManualDate();
    this.check();
    if (this.presentation === "inline" && this.canSubmit) this.commit();
  }
  private commit(): void {
    if (!this.canSubmit) return;
    const next = this.pendingValue;
    if (
      JSON.stringify(next) !==
      JSON.stringify(this[WklyPickerInputsPropertyKeys.Value])
    ) {
      this[WklyPickerInputsPropertyKeys.Value] = next;
      this.emittedValue = JSON.stringify(next);
      this.onChange(next);
      this[WklyPickerOutputsPropertyKeys.ValueChange].emit(next);
    }
    this.onTouched();
  }
  submit(reason: WklyCloseReason = "submit"): void {
    this.check();
    if (!this.canSubmit) return;
    this.commit();
    if (this.presentation === "transient")
      this[WklyPickerOutputsPropertyKeys.Closed].emit(reason);
  }
  cancel(reason: WklyCloseReason = "close-button"): void {
    if (this[WklyPickerInputsPropertyKeys.Disabled]) return;
    this.load(this[WklyPickerInputsPropertyKeys.Value]);
    this.onTouched();
    this[WklyPickerOutputsPropertyKeys.Closed].emit(reason);
  }
  now(): void {
    if (this[WklyPickerInputsPropertyKeys.Disabled]) return;
    const n = this.clock.now();
    const day = Math.floor(n.getTime() / 86400000);
    this.drafts = [0, 1].map((index) => ({
      date: this.blank(day).date,
      hour: n.getUTCHours(),
      minute:
        Math.floor(
          n.getUTCMinutes() / this[WklyPickerInputsPropertyKeys.MinuteStep],
        ) * this[WklyPickerInputsPropertyKeys.MinuteStep],
      second: this[WklyPickerInputsPropertyKeys.ShowSeconds]
        ? Math.floor(
            n.getUTCSeconds() / this[WklyPickerInputsPropertyKeys.SecondStep],
          ) * this[WklyPickerInputsPropertyKeys.SecondStep]
        : 0,
      present: index === 0 || this.isRange,
    }));
    if (
      this.hasDate &&
      (day < this.firstSupportedDay || day > this.lastSupportedDay)
    ) {
      this.report([error("unsupported-adapter-date", day)]);
      return;
    }
    this.focused = day;
    this.position(day, true);
    this.check();
    this.submit("now");
  }
  toggleView(year = false): void {
    if (this[WklyPickerInputsPropertyKeys.Disabled] || !this.hasDate) return;
    this.viewMode = year
      ? "manual"
      : this.viewMode === "calendar"
        ? "manual"
        : "calendar";
    if (this.viewMode === "calendar") this.positionOnManualDate();
    this[WklyPickerOutputsPropertyKeys.ViewModeChange].emit(this.viewMode);
    if (this.viewMode === "calendar") setTimeout(() => this.resetScroll());
    if (year && this.browser)
      setTimeout(() => {
        const field = this.host.nativeElement.querySelector(
          'input[aria-label="' + this.t("year") + '"]',
        ) as HTMLInputElement;
        if (field) {
          field.focus();
          field.select();
        }
      });
  }
  private positionOnManualDate(): void {
    const draft = this.drafts[this.manualDateEndpoint];
    if (!draft || !draft.present) return;
    try {
      // A valid day follows the selection. An impossible day keeps its draft
      // fields but still shows the chosen month in the calendar.
      const target = this.adapter.dateToEpochDay(draft.date);
      this.focused = target;
      this.position(target, true);
    } catch (_) {
      try {
        const first = this.adapter.dateToEpochDay({ ...draft.date, day: 1 });
        this.focused = first;
        this.position(first, true);
      } catch (_) {}
    }
  }
  months(draft: Draft): readonly string[] {
    try {
      return this.adapter.getMonths(draft.date.year).map((m) => m.label);
    } catch (_) {
      return [];
    }
  }
  monthCount(draft: Draft): number {
    return this.months(draft).length || 12;
  }
  field(index: number, field: string, value: number | null): void {
    if (this[WklyPickerInputsPropertyKeys.Disabled]) return;
    const draft = this.drafts[index];
    draft.present = true;
    if (field === "day" || field === "year" || field === "month") {
      this.manualDateEndpoint = index;
      let date = { ...draft.date, [field]: value } as WklyCalendarDate;
      if (field === "month") {
        let month;
        try {
          month = this.adapter
            .getMonths(date.year)
            .find((m) => m.month === value);
        } catch (_) {}
        date = { ...date, monthCode: month ? month.monthCode : "" };
      }
      if (field === "year" && value !== null) {
        try {
          const months = this.adapter.getMonths(value);
          const month = months.find((m) => m.monthCode === date.monthCode);
          if (month) date = { ...date, month: month.month };
        } catch (_) {}
      }
      draft.date = date;
    } else if (field === "hour" && this.effectiveHourCycle === "h12")
      draft.hour =
        value === null
          ? null
          : value >= 1 && value <= 12
            ? (value % 12) + ((draft.hour || 0) >= 12 ? 12 : 0)
            : 24 + value;
    else (draft as any)[field] = value;
    this.check();
  }
  displayHour(draft: Draft): number | null {
    return draft.hour === null
      ? null
      : this.effectiveHourCycle === "h12"
        ? draft.hour % 12 || 12
        : draft.hour;
  }
  period(index: number, period: "am" | "pm" | "24"): void {
    if (this[WklyPickerInputsPropertyKeys.Disabled]) return;
    if (period === "24") this.effectiveHourCycle = "h24";
    else {
      this.effectiveHourCycle = "h12";
      this.drafts[index].hour =
        ((this.drafts[index].hour || 0) % 12) + (period === "pm" ? 12 : 0);
      this.drafts[index].present = true;
      this.finish();
    }
  }
  selected(day: number): boolean {
    return this.drafts.some((d) => {
      try {
        return d.present && this.adapter.dateToEpochDay(d.date) === day;
      } catch (_) {
        return false;
      }
    });
  }
  inRange(day: number): boolean {
    if (!this.isRange || !this.drafts.every((d) => d.present)) return false;
    try {
      const a = this.adapter.dateToEpochDay(this.drafts[0].date),
        b = this.adapter.dateToEpochDay(this.drafts[1].date);
      return day > Math.min(a, b) && day < Math.max(a, b);
    } catch (_) {
      return false;
    }
  }
  dayDisabled(day: number): boolean {
    if (day < this.firstSupportedDay || day > this.lastSupportedDay)
      return true;
    try {
      const date = this.adapter.epochDayToDate(day);
      const isDateDisabled = this[WklyPickerInputsPropertyKeys.IsDateDisabled];
      if (
        isDateDisabled &&
        isDateDisabled(day, {
          mode: this[WklyPickerInputsPropertyKeys.Mode],
          endpoint: this.isRange
            ? this.drafts[0]?.present && !this.drafts[1]?.present
              ? "end"
              : "start"
            : "single",
          calendarDate: date,
        })
      )
        return true;
      const min = this[WklyPickerInputsPropertyKeys.Min];
      const max = this[WklyPickerInputsPropertyKeys.Max];
      if (min && day < decodeIso(min).epochDay) return true;
      if (max && day > decodeIso(max).epochDay) return true;
      return false;
    } catch (_) {
      return true;
    }
  }
  select(day: number): void {
    if (this[WklyPickerInputsPropertyKeys.Disabled] || this.dayDisabled(day))
      return;
    this.focused = day;
    const index =
      this.isRange && this.drafts[0].present && !this.drafts[1].present ? 1 : 0;
    if (this.isRange && index === 0) this.drafts[1].present = false;
    this.drafts[index].date = this.adapter.epochDayToDate(day);
    this.drafts[index].present = true;
    if (this.isRange && this.drafts[1].present) {
      const a = this.drafts[0],
        b = this.drafts[1];
      const key = (d: Draft) =>
        this.adapter.dateToEpochDay(d.date) * 86400 +
        (d.hour || 0) * 3600 +
        (d.minute || 0) * 60 +
        (d.second || 0);
      if (key(a) > key(b)) this.drafts = [b, a];
    }
    this.renderRows();
    this.finish();
    if (
      this.presentation === "transient" &&
      this[WklyPickerInputsPropertyKeys.Mode] === "date" &&
      this.viewMode === "calendar"
    )
      this.submit("auto-submit");
  }
  key(event: KeyboardEvent, day: number): void {
    let delta = 0;
    if (event.key === "ArrowLeft") delta = -1;
    if (event.key === "ArrowRight") delta = 1;
    if (event.key === "ArrowUp") delta = -7;
    if (event.key === "ArrowDown") delta = 7;
    if (event.key === "PageUp")
      delta = -7 * (event.shiftKey ? this.visibleCount : 1);
    if (event.key === "PageDown")
      delta = 7 * (event.shiftKey ? this.visibleCount : 1);
    if (event.key === "Home") {
      event.preventDefault();
      this.scrollToEpochDay(this.today, { focus: true });
    }
    if (delta) {
      event.preventDefault();
      const target = day + delta;
      if (target >= this.firstSupportedDay && target <= this.lastSupportedDay)
        this.scrollToEpochDay(target, { focus: true });
    }
  }
  private position(
    day: number,
    preset = false,
    options: WklyJumpOptions = {},
  ): void {
    day = Math.max(
      this.firstSupportedDay,
      Math.min(this.lastSupportedDay, day),
    );
    this.anchorWeek = absoluteWeekOf(day, this.effectiveOffset);
    const viewportPreset = this[WklyPickerInputsPropertyKeys.ViewportPreset];
    this.clipMonth = preset && viewportPreset.kind === "full-month";
    if (preset && viewportPreset.kind !== "weeks") {
      const d = this.adapter.epochDayToDate(day);
      this.initialMonth = d.year + "/" + d.monthCode;
      const start = this.adapter.dateToEpochDay({ ...d, day: 1 }),
        end = start + this.adapter.getDaysInMonth(d.year, d.monthCode) - 1;
      this.firstWeek = absoluteWeekOf(start, this.effectiveOffset);
      this.visibleCount =
        absoluteWeekOf(end, this.effectiveOffset) - this.firstWeek + 1;
      if (
        viewportPreset.kind === "full-month-and-around" &&
        !this.configErrors.length
      ) {
        const before = viewportPreset.extraWeeksBefore || 0,
          after = viewportPreset.extraWeeksAfter || 0;
        this.firstWeek -= before;
        this.visibleCount += before + after;
      }
    } else {
      if (viewportPreset.kind === "weeks")
        this.visibleCount = this.configErrors.length
          ? 6
          : viewportPreset.visibleWeekCount;
      this.firstWeek =
        this.anchorWeek -
        (options.align === "start"
          ? 0
          : options.align === "end"
            ? this.visibleCount - 1
            : Math.floor(this.visibleCount / 2));
    }
    this.firstWeek = this.clampFirstWeek(this.firstWeek);
    this.baseWeek = this.firstWeek - 1000;
    this.renderRows();
    this.resetScroll();
  }
  private resetScroll(): void {
    // Round week boundaries to avoid scrollTop truncation under CSS zoom.
    if (this.scroller)
      this.scroller.nativeElement.scrollTop = Math.round(1000 * this.rowHeight);
  }
  scroll(event: Event): void {
    const element = event.target as HTMLElement;
    this.snapPending = true;
    this.scheduleSnap();
    // Quantize displacement around the reset point, equally in both directions.
    const relativeRows = element.scrollTop / this.rowHeight - 1000;
    const index =
      1000 + Math.sign(relativeRows) * Math.round(Math.abs(relativeRows));
    const requestedFirst = this.baseWeek + index;
    const first = this.clampFirstWeek(requestedFirst);
    if (requestedFirst !== first) {
      element.scrollTop = Math.round((first - this.baseWeek) * this.rowHeight);
    }
    if (first === this.firstWeek) return;
    this.clipMonth = false;
    this.firstWeek = first;
    this.anchorWeek = first + Math.floor(this.visibleCount / 2);
    if (index < 100 || index > 1900) {
      this.baseWeek = first - 1000;
      element.scrollTop =
        1000 * this.rowHeight + (element.scrollTop % this.rowHeight);
    }
    this.renderRows();
  }
  private scheduleSnap(): void {
    if (this.scrollEndTimer) clearTimeout(this.scrollEndTimer);
    this.scrollEndTimer = setTimeout(() => this.snapWeek(), 200);
  }
  snapWeek(): void {
    if (this.scrollEndTimer) clearTimeout(this.scrollEndTimer);
    this.scrollEndTimer = undefined;
    if (!this.snapPending || !this.scroller) return;
    this.snapPending = false;
    // Align the current virtual week without rebuilding or rebasing its rows.
    const element = this.scroller.nativeElement;
    const target = Math.round(
      (this.firstWeek - this.baseWeek) * this.rowHeight,
    );
    if (element.scrollTop !== target) element.scrollTop = target;
  }
  private showFirstWeek(week: number): void {
    const first = this.clampFirstWeek(week);
    if (first === this.firstWeek) return;
    this.clipMonth = false;
    this.firstWeek = first;
    this.anchorWeek = first + Math.floor(this.visibleCount / 2);
    this.baseWeek = first - 1000;
    this.renderRows();
    this.resetScroll();
  }
  canMoveWeek(delta: number): boolean {
    return this.clampFirstWeek(this.firstWeek + delta) !== this.firstWeek;
  }
  moveWeek(delta: number): void {
    if (!this[WklyPickerInputsPropertyKeys.Disabled])
      this.showFirstWeek(this.firstWeek + delta);
  }
  private renderRows(): void {
    // Keep the virtual scroll offset here; row data is shared across Angular versions.
    const overscan = Math.max(
      0,
      Math.min(50, this[WklyPickerInputsPropertyKeys.OverscanWeeks] || 0),
    );
    const start = this.firstWeek - overscan;
    this.paddingTop = (start - this.baseWeek) * this.rowHeight;
    this.rows = createWeekRows({
      generator: this.generator,
      adapter: this.adapter,
      startWeek: start,
      count: this.visibleCount + 2 * overscan,
      firstVisibleWeek: this.firstWeek,
      firstSupportedDay: this.firstSupportedDay,
      lastSupportedDay: this.lastSupportedDay,
      clipMonth: this.clipMonth,
      initialMonth: this.initialMonth,
      weekLabelMode: this[WklyPickerInputsPropertyKeys.WeekLabelMode],
      weekLabelFormatter:
        this[WklyPickerInputsPropertyKeys.WeekLabelFormatter] || null,
      isDayDisabled: (day) => this.dayDisabled(day),
    });
    this[WklyPickerOutputsPropertyKeys.ViewportChange].emit({
      firstVisibleAbsoluteWeek: this.firstWeek,
      lastVisibleAbsoluteWeek: this.firstWeek + this.visibleCount - 1,
      anchorAbsoluteWeek: this.anchorWeek,
    });
  }
  trackRow(_i: number, row: Row): number {
    return row.week.absoluteWeek;
  }
  scrollToEpochDay(day: number, options: WklyJumpOptions = {}): void {
    integer(day);
    this.adapter.epochDayToDate(day);
    day = Math.max(
      this.firstSupportedDay,
      Math.min(this.lastSupportedDay, day),
    );
    this.position(day, false, options);
    if (options.select) this.select(day);
    if (options.focus) {
      this.focused = day;
      this.focusDay();
    }
  }
  scrollToAbsoluteWeek(week: number, options: WklyJumpOptions = {}): void {
    this.scrollToEpochDay(firstEpochDayOf(week, this.effectiveOffset), options);
  }
  scrollToCalendarDate(
    date: WklyCalendarDate,
    options: WklyJumpOptions = {},
  ): void {
    this.scrollToEpochDay(this.adapter.dateToEpochDay(date), options);
  }
  scrollToValue(value: string, options: WklyJumpOptions = {}): void {
    this.scrollToEpochDay(decodeIso(value).epochDay, options);
  }
  focusDay(): void {
    if (!this.browser) return;
    setTimeout(() => {
      const day = this.host.nativeElement.querySelector(
        '[data-day="' + this.focused + '"]',
      ) as HTMLElement;
      const fallback = this.host.nativeElement.querySelector(
        "button:not(:disabled),input:not(:disabled)",
      ) as HTMLElement;
      (day || fallback)?.focus({ preventScroll: true });
    });
  }
}
