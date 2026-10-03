import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from "@angular/core";
import { FormControl } from "@angular/forms";
import { getLocaleFirstDayOfWeek } from "@angular/common";
import { Subscription } from "rxjs";
import {
  WklyPickerValue,
  WklySelectionMode,
  WklyViewportPreset,
  WklyValidationError,
} from "wkly-datetime-picker.adapters";
import {
  decodeIso,
  encodeIso,
  resolveWeekOffset,
} from "wkly-datetime-picker.adapters";
import {
  RuntimeConfig,
  RuntimeMessage,
} from "../../wkly-datetime-picker.runtime/src/runtime-protocol";
import { PairedSelectionService } from "./paired-selection.service";
import { TRANSLATIONS } from "./translations";
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
@Component({
  selector: "demo-panel",
  standalone: false,
  templateUrl: "demo.component.html",
})
export class DemoComponent implements OnInit, OnDestroy {
  @Input() config!: DemoConfig;
  @Output() selection = new EventEmitter<WklyPickerValue>();
  @ViewChild("runtime") runtime?: { jump(value: string): void };
  private currentConfig!: RuntimeConfig;
  formStatus = "VALID";
  formTouched = false;
  private lastSent = "";
  private pairSubscription?: Subscription;
  mode: WklySelectionMode = "datetime";
  locale = "en-GB";
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
  form = new FormControl(null as WklyPickerValue);
  initial: WklyPickerValue = null;
  programmaticValue = "";
  get diagnostics(): string {
    return JSON.stringify(this.value);
  }
  get codes(): string {
    return this.errors.map((e) => e.code).join(", ") || "valid";
  }
  get context(): string {
    return `${this.locale} · ${this.config.calendar || "gregorian"} · offset ${resolveWeekOffset(this.locale, this.weekOffset, null, getLocaleFirstDayOfWeek(this.locale))} · ${this.hourCycle}`;
  }
  get initialEpochDay(): number | null {
    return this.config.validation
      ? decodeIso("2099-12-16T00:00:00.000Z").epochDay
      : null;
  }
  constructor(
    private pairs: PairedSelectionService,
    private changes: ChangeDetectorRef,
  ) {}
  ngOnInit(): void {
    this.reset();
    if (
      this.config.id === "gregorian-pair" ||
      this.config.id === "hebrew-pair" ||
      this.config.id === "hijri-pair"
    ) {
      this.pairSubscription = this.pairs.changed.subscribe((value) =>
        this.setExternal(value),
      );
    }
  }
  ngOnDestroy(): void {
    this.pairSubscription?.unsubscribe();
  }
  private configuration(): RuntimeConfig {
    return {
      mode: this.mode,
      value: this.value,
      locale: this.locale,
      calendar: (this.config.calendar ||
        "gregorian") as RuntimeConfig["calendar"],
      presentation: (this.config.presentation ||
        "inline") as RuntimeConfig["presentation"],
      weekOffset: this.weekOffset,
      weekLabelMode: this.showWeekNumbers ? "locale" : "hidden",
      viewportPreset: this.preset as RuntimeConfig["viewportPreset"],
      initialEpochDay: this.initialEpochDay,
      hourCycle: this.hourCycle,
      showSeconds: this.seconds,
      minuteStep: this.minuteStep,
      min: this.min,
      max: this.max,
      required: this.required,
      disabled: this.disabled,
      allowRangeAcrossDisabled: this.across,
      validation: !!this.config.validation,
      translations: TRANSLATIONS,
      color: this.config.color || "#176c55",
      size: this.config.size || 1,
      dark: this.config.theme === "dark",
    };
  }
  get runtimeConfig(): RuntimeConfig {
    const payload = this.configuration();
    const serialized = JSON.stringify(payload);
    if (serialized !== this.lastSent) {
      this.lastSent = serialized;
      this.currentConfig = payload;
    }
    return this.currentConfig;
  }
  receive(message: RuntimeMessage): void {
    switch (message.type) {
      case "wkly:valueChange":
        this.commit(message.payload as WklyPickerValue);
        break;
      case "wkly:validationChange":
        this.errors = (message.payload || []) as WklyValidationError[];
        break;
      case "wkly:viewportChange": {
        const value = message.payload as {
          firstVisibleAbsoluteWeek: number;
          lastVisibleAbsoluteWeek: number;
        };
        this.viewport = `${value.firstVisibleAbsoluteWeek} … ${value.lastVisibleAbsoluteWeek}`;
        break;
      }
      case "wkly:closed":
        this.lastClose = String(message.payload || "programmatic");
        break;
      case "wkly:formState": {
        const state = message.payload as { status: string; touched: boolean };
        this.formStatus = state.status;
        this.formTouched = state.touched;
        break;
      }
    }
  }
  jump(value: string): void {
    this.runtime?.jump(value);
  }
  reset(): void {
    this.mode = this.config.mode || "datetime";
    this.locale = this.config.locale || "en-GB";
    this.seconds = !!this.config.seconds;
    this.showWeekNumbers = true;
    this.hourCycle = this.config.hourCycle || "h24";
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
    this.formStatus = "VALID";
    this.formTouched = false;
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
    // Companions receive a programmatic value, so synchronization emits no extra user edits.
    if (this.config.id.endsWith("-pair") && typeof value === "string")
      this.pairs.select(encodeIso(decodeIso(value), "date"));
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
    // The next change detection pass updates the picker configuration.
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
    this.changes.detectChanges();
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
