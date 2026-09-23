import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from "@angular/core";
import { FormControl } from "@angular/forms";
import { getLocaleFirstDayOfWeek } from "@angular/common";
import {
  WklyDateTimePickerComponent,
  WklyPickerValue,
  WklySelectionMode,
  WklyViewportPreset,
  WklyValidationError,
} from "wkly-datetime-picker";
import {
  WklyCalendarAdapter,
  WklyGregorianCalendarAdapter,
  decodeIso,
  encodeIso,
  resolveWeekOffset,
} from "wkly-datetime-picker.adapters";
import { floorMod } from "wkly-datetime-picker.core";
import { ShowcaseHebrewCalendarAdapter } from "./hebrew-adapter";
export interface DemoConfig {
  id: string;
  title: string;
  description: string;
  mode?: WklySelectionMode;
  locale?: string;
  calendar?: string;
  presentation?: string;
  seconds?: boolean;
  hourCycle?: string;
  preset?: WklyViewportPreset;
  color?: string;
  theme?: "dark";
  size?: number;
  validation?: boolean;
  value?: WklyPickerValue;
}
@Component({ selector: "demo-panel", templateUrl: "demo.component.html" })
export class DemoComponent implements OnInit {
  @Input() config!: DemoConfig;
  @Output() selection = new EventEmitter<WklyPickerValue>();
  @ViewChild("picker") picker?: WklyDateTimePickerComponent;
  mode: WklySelectionMode = "datetime";
  locale = "en-GB";
  adapter: WklyCalendarAdapter = new WklyGregorianCalendarAdapter("en-GB");
  preset: WklyViewportPreset = { kind: "full-month" };
  presetName = "full-month";
  hourCycle: any = "h24";
  seconds = false;
  showWeekNumbers = true;
  minuteStep = 1;
  weekOffset: any = null;
  value: WklyPickerValue = null;
  errors: readonly WklyValidationError[] = [];
  emitted = 0;
  lastClose = "—";
  viewport = "";
  required = false;
  disabled = false;
  across = false;
  min: string | null = null;
  max: string | null = null;
  form = new FormControl(null);
  initial: WklyPickerValue = null;
  programmaticValue = "";
  get diagnostics(): string {
    return JSON.stringify(this.value);
  }
  get codes(): string {
    return this.errors.map((e) => e.code).join(", ") || "valid";
  }
  get context(): string {
    return `${this.locale} · ${this.adapter.calendarId} · offset ${resolveWeekOffset(this.locale, this.weekOffset, null, getLocaleFirstDayOfWeek(this.locale))} · ${this.hourCycle}`;
  }
  get initialEpochDay(): number | null {
    return this.config.validation
      ? decodeIso("2099-12-16T00:00:00.000Z").epochDay
      : null;
  }
  readonly unavailableDate = (day: number) => floorMod(day + 4, 7) === 0;
  readonly unavailableTime = (seconds: number) =>
    seconds >= 12 * 3600 && seconds < 13 * 3600;
  ngOnInit(): void {
    this.reset();
  }
  reset(): void {
    this.mode = this.config.mode || "datetime";
    this.locale = this.config.locale || "en-GB";
    this.seconds = !!this.config.seconds;
    this.showWeekNumbers = true;
    this.hourCycle = this.config.hourCycle || "h24";
    this.adapter =
      this.config.calendar === "hebrew"
        ? new ShowcaseHebrewCalendarAdapter(this.locale)
        : new WklyGregorianCalendarAdapter(this.locale);
    this.preset = this.config.preset || { kind: "full-month" };
    this.presetName = this.preset.kind;
    this.weekOffset = this.locale === "en-US" ? 3 : null;
    this.initial =
      this.config.value === undefined
        ? this.mode.endsWith("range")
          ? null
          : this.mode === "time"
            ? "0000-01-01T13:00:00.000Z"
            : this.mode === "date"
              ? "2099-12-16T00:00:00.000Z"
              : "2099-12-16T13:00:00.000Z"
        : this.config.value;
    this.value = this.initial;
    this.form.setValue(this.value);
    this.errors = [];
    this.emitted = 0;
    this.lastClose = "—";
    this.required = !!this.config.validation;
    this.disabled = false;
    this.form.enable();
    this.min = this.config.validation ? "2099-12-01T00:00:00.000Z" : null;
    this.max = this.config.validation ? "2100-01-31T23:59:00.000Z" : null;
  }
  commit(value: WklyPickerValue): void {
    this.value = value;
    this.emitted++;
    this.selection.emit(value);
  }
  clear(): void {
    this.value = null;
    this.form.setValue(null);
  }
  modeChanged(): void {
    this.clear();
    if (this.config.validation && this.mode.startsWith("time")) {
      this.min = null;
      this.max = null;
    }
  }
  localeChanged(): void {
    this.adapter =
      this.config.calendar === "hebrew"
        ? new ShowcaseHebrewCalendarAdapter(this.locale)
        : new WklyGregorianCalendarAdapter(this.locale);
  }
  presetChanged(): void {
    this.preset =
      this.presetName === "weeks"
        ? { kind: "weeks", visibleWeekCount: 4 }
        : this.presetName === "full-month-and-around"
          ? {
              kind: "full-month-and-around",
              extraWeeksBefore: 1,
              extraWeeksAfter: 1,
            }
          : { kind: "full-month" };
  }
  setExternal(value: WklyPickerValue): void {
    this.value = value;
    this.form.setValue(value);
  }
  changeDisabled(): void {
    if (this.disabled) this.form.disable();
    else this.form.enable();
  }
  applyValue(): void {
    let value: any = this.programmaticValue;
    try {
      if (value.startsWith("[") || value === "null") value = JSON.parse(value);
    } catch (_) {}
    this.setExternal(value);
  }
}
