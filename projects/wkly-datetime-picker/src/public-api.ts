import { AbsoluteWeek, WklyWeekOffset } from "wkly-datetime-picker.core";
import {
  WklyCalendarAdapter,
  WklyDisabledDatePredicate,
  WklyDisabledTimePredicate,
  WklyHourCycle,
  WklyPickerValue,
  WklyRangeValidator,
  WklySelectionMode,
  WklyValidationError,
  WklyViewportPreset,
  WklyWeekLabelFormatter,
  WklyWeekLabelMode,
} from "wkly-datetime-picker.adapters";
/** Rendered buffer weeks on each side of the visible calendar. */
export const DEFAULT_OVERSCAN_WEEKS = 3;
export type WklyCloseReason =
  | "submit"
  | "auto-submit"
  | "now"
  | "close-button"
  | "escape"
  | "backdrop"
  | "programmatic";
export interface WklyJumpOptions {
  readonly focus?: boolean;
  readonly select?: boolean;
  readonly align?: "start" | "center" | "end";
}
export interface WklyViewportChange {
  readonly firstVisibleAbsoluteWeek: AbsoluteWeek;
  readonly lastVisibleAbsoluteWeek: AbsoluteWeek;
  readonly anchorAbsoluteWeek: AbsoluteWeek;
}
export interface WklyClock {
  now(): Date;
}
export interface WklyConfiguration {
  readonly locale?: string;
  readonly weekOffset?: WklyWeekOffset;
  readonly initialEpochDay?: number;
}
export type WklyStrings = Readonly<Record<string, string>>;
export type WklyTranslations = Readonly<Record<string, WklyStrings>>;
/** Input properties every Angular-specific picker and trigger must expose. */
export interface WklyPickerInputs {
  mode: WklySelectionMode;
  value: WklyPickerValue;
  calendarAdapter: WklyCalendarAdapter;
  locale: string;
  weekOffset: WklyWeekOffset | null;
  viewportPreset: WklyViewportPreset;
  hourCycle: WklyHourCycle;
  showSeconds: boolean;
  minuteStep: number;
  secondStep: number;
  min: string | null;
  max: string | null;
  isDateDisabled: WklyDisabledDatePredicate | null;
  isTimeDisabled: WklyDisabledTimePredicate | null;
  rangeValidator: WklyRangeValidator | null;
  allowRangeAcrossDisabled: boolean;
  required: boolean;
  disabled: boolean;
  weekLabelMode: WklyWeekLabelMode;
  weekLabelFormatter: WklyWeekLabelFormatter | null;
  weekCacheSize: number;
  overscanWeeks: number;
  ariaLabel: string | null;
  ariaDescribedBy: string | null;
  initialEpochDay: number | null;
  closeOnBackdrop: boolean;
  validators: readonly ((
    value: WklyPickerValue,
  ) => WklyValidationError | null)[];
  translations: WklyTranslations | null;
}
export const ENGLISH: WklyStrings = {
  manual: "Manual date entry",
  calendar: "Calendar view",
  now: "Now",
  close: "Close picker",
  confirm: "Confirm",
  start: "Start",
  end: "End",
  day: "Day",
  month: "Month",
  year: "Year",
  hour: "Hour",
  minute: "Minute",
  second: "Second",
  previous: "Previous week",
  next: "Next week",
  am: "AM",
  pm: "PM",
  "malformed-iso": "Enter a canonical UTC ISO value.",
  "wrong-value-shape": "The value does not match this selection mode.",
  incomplete: "Complete all fields and both range endpoints.",
  "invalid-calendar-date":
    "This date does not exist. Correct the day, month or year.",
  "unsupported-adapter-date":
    "This date is outside the calendar’s supported range.",
  "below-minimum": "Choose a value on or after the minimum.",
  "above-maximum": "Choose a value on or before the maximum.",
  "disabled-endpoint": "This value is unavailable.",
  "range-crosses-disabled": "This range includes an unavailable value.",
  "invalid-time": "Enter a valid time.",
  "step-mismatch": "Use a value aligned with the configured step.",
  "custom-validator": "This selection is not allowed.",
  "configuration-error": "The picker configuration is invalid.",
};
export function coerceBoolean(value: unknown): boolean {
  return (
    value !== null &&
    value !== undefined &&
    value !== false &&
    value !== "false"
  );
}
export const INPUT_NAMES = [
  "mode",
  "value",
  "calendarAdapter",
  "locale",
  "weekOffset",
  "viewportPreset",
  "hourCycle",
  "showSeconds",
  "minuteStep",
  "secondStep",
  "min",
  "max",
  "isDateDisabled",
  "isTimeDisabled",
  "rangeValidator",
  "allowRangeAcrossDisabled",
  "required",
  "disabled",
  "weekLabelMode",
  "weekLabelFormatter",
  "weekCacheSize",
  "overscanWeeks",
  "ariaLabel",
  "ariaDescribedBy",
  "initialEpochDay",
  "closeOnBackdrop",
  "validators",
  "translations",
] as const;
type AssertNever<T extends never> = T;
type _MissingInputNames = AssertNever<
  Exclude<keyof WklyPickerInputs, (typeof INPUT_NAMES)[number]>
>;
type _UnknownInputNames = AssertNever<
  Exclude<(typeof INPUT_NAMES)[number], keyof WklyPickerInputs>
>;
