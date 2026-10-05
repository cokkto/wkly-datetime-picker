import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  effect,
  forwardRef,
  Inject,
  LOCALE_ID,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
  untracked,
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
  draftDayDifference,
  setDraftDayDifference,
  calendarMonthBounds,
  resolveWklyTranslation,
  createWeekRows,
  validateDrafts,
  WklyDraft as Draft,
  WklyWeekRow as Row,
  WklyPickerInputs as WklyPickerInputsContract,
  WklyPickerInputsPropertyKeys,
  WklyPickerOutputsPropertyKeys,
} from "wkly-datetime-picker";
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
  WKLY_CLOCK,
  WKLY_CONFIG,
  WKLY_LOCALIZATION,
  WKLY_TRANSLATIONS,
  WklyClock,
  WklyCloseReason,
  WklyConfiguration,
  WklyJumpOptions,
  WklyPickerInputs,
  unwrapWklyPickerSignalInputs,
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
  standalone: false,
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
  implements OnInit, AfterViewInit, OnDestroy, ControlValueAccessor, Validator
{
  @ViewChild("scroller") scroller?: ElementRef<HTMLElement>;
  presentation: "inline" | "transient" = "inline";
  viewMode: "calendar" | "manual" = "calendar";
  endView: "date" | "days" = "date";
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
  private destroyed = false;
  private scrollEndTimer?: ReturnType<typeof setTimeout>;
  private snapPending = false;
  private onChange: (value: WklyPickerValue) => void = () => {};
  private onTouched: () => void = () => {};
  private validatorChanged: () => void = () => {};
  private configErrors: WklyValidationError[] = [];
  private pendingValue: WklyPickerValue = null;
  private emittedValue: string | null = null;
  private manualDateEndpoint = 0;
  private readonly formValue = signal<WklyPickerValue | undefined>(undefined);
  private readonly formDisabled = signal(false);
  private previousInputs?: WklyPickerInputsContract;
  currentValue(): WklyPickerValue {
    return this.formValue() === undefined
      ? this[WklyPickerInputsPropertyKeys.Value]()
      : this.formValue()!;
  }
  isDisabled(): boolean {
    return this[WklyPickerInputsPropertyKeys.Disabled]() || this.formDisabled();
  }
  constructor(
    @Inject(LOCALE_ID) private defaultLocale: string,
    @Inject(WKLY_CONFIG) private defaults: WklyConfiguration,
    @Inject(WKLY_CLOCK) private clock: WklyClock,
    @Inject(WKLY_LOCALIZATION) private strings: WklyStrings,
    @Inject(WKLY_TRANSLATIONS) private defaultTranslations: WklyTranslations,
    @Inject(PLATFORM_ID) platform: Object,
    private host: ElementRef<HTMLElement>,
    private changeDetector: ChangeDetectorRef,
  ) {
    super();
    this.browser = isPlatformBrowser(platform);
    effect(() => {
      const inputs =
        unwrapWklyPickerSignalInputs<WklyPickerInputsContract>(this);
      const previous = this.previousInputs;
      this.previousInputs = inputs;
      if (!previous || !this.initialized) return;
      const changed = (key: keyof typeof inputs) =>
        !Object.is(previous[key], inputs[key]);
      if (
        !Object.keys(inputs).some((key) => changed(key as keyof typeof inputs))
      )
        return;
      untracked(() => {
        if (changed(WklyPickerInputsPropertyKeys.Value))
          this.formValue.set(undefined);
        if (
          changed(WklyPickerInputsPropertyKeys.Value) &&
          this.emittedValue === JSON.stringify(this.currentValue()) &&
          Object.keys(inputs).every(
            (key) =>
              key === WklyPickerInputsPropertyKeys.Value ||
              !changed(key as keyof typeof inputs),
          )
        ) {
          this.emittedValue = null;
          return;
        }
        const focus = this.focused;
        this.configure();
        if (
          changed(WklyPickerInputsPropertyKeys.Value) ||
          changed(WklyPickerInputsPropertyKeys.Mode) ||
          changed(WklyPickerInputsPropertyKeys.CalendarAdapter)
        ) {
          this.load(this.currentValue());
          this.position(this.focused, true);
        } else {
          this.check();
          if (changed(WklyPickerInputsPropertyKeys.ViewportPreset))
            this.position(focus, true);
          else this.scrollToEpochDay(focus);
        }
      });
    });
  }
  ngOnInit(): void {
    this.initialize();
  }
  initialize(): void {
    if (this.initialized) return;
    this.configure();
    const initialEpochDay =
      this[WklyPickerInputsPropertyKeys.InitialEpochDay]();
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
    this.load(this.currentValue());
    this.initialized = true;
    this.position(this.focused, true);
  }
  configure(): void {
    this.configErrors = [];
    this.effectiveLocale =
      this[WklyPickerInputsPropertyKeys.Locale]() ||
      this.defaults.locale ||
      this.defaultLocale;
    this.direction = /^(ar|he|fa|ur)(-|$)/.test(this.effectiveLocale)
      ? "rtl"
      : "ltr";
    this.adapter =
      this[WklyPickerInputsPropertyKeys.CalendarAdapter]() ||
      new WklyGregorianCalendarAdapter(this.effectiveLocale);
    try {
      let firstDay: number | undefined;
      try {
        firstDay = getLocaleFirstDayOfWeek(this.effectiveLocale);
      } catch (_) {}
      this.effectiveOffset = resolveWeekOffset(
        this.effectiveLocale,
        this[WklyPickerInputsPropertyKeys.WeekOffset](),
        this.defaults.weekOffset,
        firstDay,
      );
      integer(this[WklyPickerInputsPropertyKeys.WeekCacheSize]());
      integer(this[WklyPickerInputsPropertyKeys.OverscanWeeks]());
      if (
        this[WklyPickerInputsPropertyKeys.WeekCacheSize]() < 0 ||
        this[WklyPickerInputsPropertyKeys.OverscanWeeks]() < 0 ||
        this[WklyPickerInputsPropertyKeys.OverscanWeeks]() > 50
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
        ].includes(this[WklyPickerInputsPropertyKeys.Mode]())
      )
        throw new RangeError();
      const preset = this[WklyPickerInputsPropertyKeys.ViewportPreset]();
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
        cacheSize: this[WklyPickerInputsPropertyKeys.WeekCacheSize](),
      });
    } catch (_) {
      this.configErrors.push(
        error(
          "configuration-error",
          this[WklyPickerInputsPropertyKeys.WeekOffset](),
        ),
      );
      this.generator = createWeekGenerator();
      this.effectiveOffset = 0;
    }
    this.setSupportedScrollRange();
    this.effectiveHourCycle =
      this[WklyPickerInputsPropertyKeys.HourCycle]() === "h12"
        ? "h12"
        : this[WklyPickerInputsPropertyKeys.HourCycle]() === "locale"
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
    this.destroyed = true;
    if (this.observer) this.observer.disconnect();
    if (this.scrollEndTimer) clearTimeout(this.scrollEndTimer);
    if (this.generator) this.generator.clearCache();
  }
  t(key: string): string {
    return resolveWklyTranslation(
      key,
      this.effectiveLocale,
      this[WklyPickerInputsPropertyKeys.Translations]() ||
        this.defaultTranslations,
      this.strings,
    );
  }
  get isRange(): boolean {
    return this[WklyPickerInputsPropertyKeys.Mode]().endsWith("-range");
  }
  get hasDate(): boolean {
    return !this[WklyPickerInputsPropertyKeys.Mode]().startsWith("time");
  }
  get hasTime(): boolean {
    return (
      this[WklyPickerInputsPropertyKeys.Mode]() !== "date" &&
      this[WklyPickerInputsPropertyKeys.Mode]() !== "date-range"
    );
  }
  get submitVisible(): boolean {
    return (
      this.presentation === "transient" &&
      (this[WklyPickerInputsPropertyKeys.Mode]() !== "date" ||
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
      !this.isDisabled() && !this.errors.length && this.pendingValue !== null
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
    const validation = validateSelection(
      value,
      unwrapWklyPickerSignalInputs<WklyPickerInputsContract>(this),
      this.adapter,
    );
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
    this.formValue.set(value);
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
    this.formDisabled.set(disabled);
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
      selection: unwrapWklyPickerSignalInputs<WklyPickerInputsContract>(this),
      mode: this[WklyPickerInputsPropertyKeys.Mode](),
      isRange: this.isRange,
      hasDate: this.hasDate,
      hasTime: this.hasTime,
      showSeconds: this[WklyPickerInputsPropertyKeys.ShowSeconds](),
      required: this[WklyPickerInputsPropertyKeys.Required](),
    });
    this.pendingValue = result.pendingValue;
    this.report(result.errors);
  }
  trackDraft(index: number): number {
    // Endpoint controls keep their identity and focus when draft objects swap.
    return index;
  }
  private orderDrafts(): void {
    if (!this.isRange || !this.drafts.every((draft) => draft.present)) return;
    if (this.drafts.some((draft) => draft.unsupportedEpochDay !== undefined))
      return;
    try {
      const a = this.drafts[0],
        b = this.drafts[1];
      const key = (d: Draft) =>
        this.adapter.dateToEpochDay(d.date) * 86400 +
        (d.hour || 0) * 3600 +
        (d.minute || 0) * 60 +
        (d.second || 0);
      if (key(a) > key(b)) this.drafts = [b, a];
    } catch (_) {
      // Impossible or incomplete dates remain editable until corrected.
    }
  }
  finish(): void {
    if (this.isDisabled()) return;
    this.orderDrafts();
    if (this.viewMode === "manual" && this.hasDate) this.positionOnManualDate();
    this.check();
    if (this.presentation === "inline" && this.canSubmit) this.commit();
  }
  private commit(): void {
    if (!this.canSubmit) return;
    const next = this.pendingValue;
    if (JSON.stringify(next) !== JSON.stringify(this.currentValue())) {
      this.formValue.set(next);
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
    if (this.isDisabled()) return;
    this.load(this.currentValue());
    this.onTouched();
    this[WklyPickerOutputsPropertyKeys.Closed].emit(reason);
  }
  now(): void {
    if (this.isDisabled()) return;
    const n = this.clock.now();
    const day = Math.floor(n.getTime() / 86400000);
    this.drafts = [0, 1].map((index) => ({
      date: this.blank(day).date,
      hour: n.getUTCHours(),
      minute:
        Math.floor(
          n.getUTCMinutes() / this[WklyPickerInputsPropertyKeys.MinuteStep](),
        ) * this[WklyPickerInputsPropertyKeys.MinuteStep](),
      second: this[WklyPickerInputsPropertyKeys.ShowSeconds]()
        ? Math.floor(
            n.getUTCSeconds() / this[WklyPickerInputsPropertyKeys.SecondStep](),
          ) * this[WklyPickerInputsPropertyKeys.SecondStep]()
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
    if (this.isDisabled() || !this.hasDate) return;
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
  get inDays(): number | null {
    return draftDayDifference(this.drafts, this.adapter);
  }
  get inDaysLabel(): string {
    const days = this.inDays;
    return this.t("inDays").replace(
      /{{\s*days\s*}}/g,
      days === null
        ? this.t("daysUnavailable")
        : new Intl.NumberFormat(this.effectiveLocale, {
            useGrouping: false,
          }).format(days),
    );
  }
  get resultingEndDate(): string {
    try {
      const draft = this.drafts[1];
      if (
        draft.unsupportedEpochDay !== undefined ||
        this.adapter.validateDate(draft.date).length
      )
        return "";
      return this.adapter.formatDate(draft.date);
    } catch (_) {
      return "";
    }
  }
  toggleEndView(view: "date" | "days"): void {
    if (this.isDisabled()) return;
    this.endView = view;
  }
  days(value: number | null): void {
    if (this.isDisabled()) return;
    this.manualDateEndpoint = 1;
    setDraftDayDifference(this.drafts, this.adapter, value);
    this.check();
  }
  field(index: number, field: string, value: number | null): void {
    if (this.isDisabled()) return;
    const draft = this.drafts[index];
    draft.present = true;
    if (field === "day" || field === "year" || field === "month") {
      this.manualDateEndpoint = index;
      delete draft.unsupportedEpochDay;
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
    if (this.isDisabled()) return;
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
      const isDateDisabled =
        this[WklyPickerInputsPropertyKeys.IsDateDisabled]();
      if (
        isDateDisabled &&
        isDateDisabled(day, {
          mode: this[WklyPickerInputsPropertyKeys.Mode](),
          endpoint: this.isRange
            ? this.drafts[0]?.present && !this.drafts[1]?.present
              ? "end"
              : "start"
            : "single",
          calendarDate: date,
        })
      )
        return true;
      const min = this[WklyPickerInputsPropertyKeys.Min](),
        max = this[WklyPickerInputsPropertyKeys.Max]();
      if (min && day < decodeIso(min).epochDay) return true;
      if (max && day > decodeIso(max).epochDay) return true;
      return false;
    } catch (_) {
      return true;
    }
  }
  select(day: number): void {
    if (this.isDisabled() || this.dayDisabled(day)) return;
    this.focused = day;
    const index =
      this.isRange && this.drafts[0].present && !this.drafts[1].present ? 1 : 0;
    if (this.isRange && index === 0) this.drafts[1].present = false;
    delete this.drafts[index].unsupportedEpochDay;
    this.drafts[index].date = this.adapter.epochDayToDate(day);
    this.drafts[index].present = true;
    this.orderDrafts();
    this.renderRows();
    this.finish();
    if (
      this.presentation === "transient" &&
      this[WklyPickerInputsPropertyKeys.Mode]() === "date" &&
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
    const viewportPreset = this[WklyPickerInputsPropertyKeys.ViewportPreset]();
    this.clipMonth = preset && viewportPreset.kind === "full-month";
    if (preset && viewportPreset.kind !== "weeks") {
      const d = this.adapter.epochDayToDate(day);
      this.initialMonth = d.year + "/" + d.monthCode;
      const [start, end] = calendarMonthBounds(this.adapter, day);
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
    // Apply the new runway before writing scrollTop or locating a focus target.
    this.changeDetector.detectChanges();
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
      // Preserve signed displacement from this week; modulo turns fractional
      // rounding just below a boundary into almost a full row after rebasing.
      const offset =
        element.scrollTop - (first - this.baseWeek) * this.rowHeight;
      this.baseWeek = first - 1000;
      element.scrollTop = Math.round(1000 * this.rowHeight + offset);
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
    if (!this.isDisabled()) this.showFirstWeek(this.firstWeek + delta);
  }
  private renderRows(): void {
    // Keep the virtual scroll offset here; row data is shared across Angular versions.
    const overscan = Math.max(
      0,
      Math.min(50, this[WklyPickerInputsPropertyKeys.OverscanWeeks]() || 0),
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
      weekLabelMode: this[WklyPickerInputsPropertyKeys.WeekLabelMode](),
      weekLabelFormatter:
        this[WklyPickerInputsPropertyKeys.WeekLabelFormatter]() || null,
      isDayDisabled: (day) => this.dayDisabled(day),
    });
    this[WklyPickerOutputsPropertyKeys.ViewportChange].emit({
      firstVisibleAbsoluteWeek: this.firstWeek,
      lastVisibleAbsoluteWeek: this.firstWeek + this.visibleCount - 1,
      anchorAbsoluteWeek: this.anchorWeek,
    });
  }
  // Retain day DOM nodes and keyboard focus when row metadata is regenerated.
  trackCell(_i: number, cell: { epochDay: number }): number {
    return cell.epochDay;
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
    // position renders synchronously; publish the tab stop before that render.
    if (options.focus) this.focused = day;
    this.position(day, false, options);
    if (options.select) this.select(day);
    if (options.focus) this.focusDay();
  }
  scrollToAbsoluteWeek(week: number, options: WklyJumpOptions = {}): void {
    // A boundary week can start before the adapter's first supported day.
    const first = firstEpochDayOf(week, this.effectiveOffset);
    this.scrollToEpochDay(
      week === this.firstSupportedWeek
        ? Math.max(first, this.firstSupportedDay)
        : first,
      options,
    );
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
      if (this.destroyed) return;
      this.changeDetector.detectChanges();
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
