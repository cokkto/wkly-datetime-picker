import { ChangeDetectorRef, Directive, ViewChild } from "@angular/core";
import { WklyJumpOptions, WklyTranslations } from "wkly-datetime-picker";
import {
  WklyCalendarDate,
  WklyGregorianCalendarAdapter,
  WklyPickerValue,
  WklySelectionMode,
  WklyValidationError,
} from "wkly-datetime-picker.adapters";
import { absoluteWeekOf, firstEpochDayOf } from "wkly-datetime-picker.core";
import { ShowcaseHebrewCalendarAdapter } from "../../wkly-datetime-picker.showcase/src/hebrew-adapter";
import { ShowcaseHijriCalendarAdapter } from "../../wkly-datetime-picker.showcase/src/hijri-adapter";

interface JumpTarget {
  close?(): void;
  scrollToAbsoluteWeek(week: number, options?: WklyJumpOptions): void;
  scrollToCalendarDate(date: WklyCalendarDate, options?: WklyJumpOptions): void;
  scrollToValue(value: string, options?: WklyJumpOptions): void;
}

/** A controlled host for public Angular contracts, shared by every versioned testbed. */
@Directive()
export class AngularContractController {
  constructor(private changes: ChangeDetectorRef) {}
  @ViewChild("inline") inline?: JumpTarget;
  @ViewChild("dialog") dialog?: JumpTarget;
  @ViewChild("overlay") overlay?: JumpTarget;
  readonly params = new URLSearchParams(window.location.search);
  readonly presentation = this.params.get("presentation") || "inline";
  readonly calendar = this.params.get("calendar") || "gregorian";
  readonly adapter =
    this.calendar === "hebrew"
      ? new ShowcaseHebrewCalendarAdapter("he-IL")
      : this.calendar === "hijri"
        ? new ShowcaseHijriCalendarAdapter("ar")
        : new WklyGregorianCalendarAdapter("en-GB");
  locale = "";
  offset: 0 | 4 | null = null;
  initial: number | null = this.params.has("initial")
    ? Number(this.params.get("initial"))
    : null;
  mode: WklySelectionMode = "datetime";
  value: WklyPickerValue = this.params.get("value");
  min: string | null = null;
  required = false;
  disabled = false;
  minuteStep = 1;
  translations: WklyTranslations | null = null;
  errors: readonly WklyValidationError[] = [];
  emissions = 0;
  targetDay = 0;
  readonly disabledDay = 47467;
  readonly unavailable = (day: number) => day === this.disabledDay;
  get diagnostics(): string {
    return JSON.stringify(this.value);
  }
  get codes(): string {
    return this.errors.map((error) => error.code).join(", ") || "valid";
  }
  get offsetValue(): 0 | 3 | 4 {
    return this.offset === null ? 3 : this.offset;
  }
  jump(
    method: "week" | "calendar" | "value",
    boundary: "past" | "min" | "max",
  ): void {
    const requested =
      boundary === "past"
        ? -16
        : this.adapter.supportedEpochDayRange[boundary === "min" ? 0 : 1];
    const week = absoluteWeekOf(requested, this.offsetValue);
    this.targetDay =
      method === "week"
        ? Math.max(
            this.adapter.supportedEpochDayRange[0],
            firstEpochDayOf(week, this.offsetValue),
          )
        : requested;
    const target =
      this.presentation === "dialog"
        ? this.dialog
        : this.presentation === "overlay"
          ? this.overlay
          : this.inline;
    const options: WklyJumpOptions = { focus: true, align: "center" };
    if (method === "week") target?.scrollToAbsoluteWeek(week, options);
    if (method === "calendar")
      target?.scrollToCalendarDate(
        this.adapter.epochDayToDate(requested),
        options,
      );
    if (method === "value")
      target?.scrollToValue(
        new Date(requested * 86400000).toISOString(),
        options,
      );
  }
  commit(value: WklyPickerValue): void {
    this.value = value;
    this.emissions++;
  }
  cancelJump(): void {
    this.jump("value", "past");
    const target = this.presentation === "dialog" ? this.dialog : this.overlay;
    target?.close?.();
  }
  validation(errors: readonly WklyValidationError[]): void {
    // Defer diagnostics because picker initialization can emit during a host view check.
    Promise.resolve().then(() => {
      this.errors = errors;
      this.changes.markForCheck();
    });
  }
  write(): void {
    this.value = "2099-12-16T13:00:00.000Z";
  }
  language(locale: string): void {
    this.locale = locale;
  }
  catalog(): void {
    this.translations = {
      "EN-gb": { now: "Regional now", confirm: "Regional confirm" },
      en: {
        now: "Language now",
        next: "Language next",
        confirm: "Language confirm",
      },
      "he-IL": { now: "Regional Hebrew now" },
      he: { next: "Hebrew next" },
    };
  }
}
