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
export enum WklyPickerInputsPropertyKeys {
  Mode = "mode",
  Value = "value",
  CalendarAdapter = "calendarAdapter",
  Locale = "locale",
  WeekOffset = "weekOffset",
  ViewportPreset = "viewportPreset",
  HourCycle = "hourCycle",
  ShowSeconds = "showSeconds",
  MinuteStep = "minuteStep",
  SecondStep = "secondStep",
  Min = "min",
  Max = "max",
  IsDateDisabled = "isDateDisabled",
  IsTimeDisabled = "isTimeDisabled",
  RangeValidator = "rangeValidator",
  AllowRangeAcrossDisabled = "allowRangeAcrossDisabled",
  Required = "required",
  Disabled = "disabled",
  WeekLabelMode = "weekLabelMode",
  WeekLabelFormatter = "weekLabelFormatter",
  WeekCacheSize = "weekCacheSize",
  OverscanWeeks = "overscanWeeks",
  AriaLabel = "ariaLabel",
  AriaDescribedBy = "ariaDescribedBy",
  InitialEpochDay = "initialEpochDay",
  CloseOnBackdrop = "closeOnBackdrop",
  Validators = "validators",
  Translations = "translations",
}
export enum WklyPickerOutputsPropertyKeys {
  ValueChange = "valueChange",
  ValidationChange = "validationChange",
  Opened = "opened",
  Closed = "closed",
  ViewportChange = "viewportChange",
  ViewModeChange = "viewModeChange",
}
export interface WklyPickerInputs {
  [WklyPickerInputsPropertyKeys.Mode]: WklySelectionMode;
  [WklyPickerInputsPropertyKeys.Value]: WklyPickerValue;
  [WklyPickerInputsPropertyKeys.CalendarAdapter]: WklyCalendarAdapter;
  [WklyPickerInputsPropertyKeys.Locale]: string;
  [WklyPickerInputsPropertyKeys.WeekOffset]: WklyWeekOffset | null;
  [WklyPickerInputsPropertyKeys.ViewportPreset]: WklyViewportPreset;
  [WklyPickerInputsPropertyKeys.HourCycle]: WklyHourCycle;
  [WklyPickerInputsPropertyKeys.ShowSeconds]: boolean;
  [WklyPickerInputsPropertyKeys.MinuteStep]: number;
  [WklyPickerInputsPropertyKeys.SecondStep]: number;
  [WklyPickerInputsPropertyKeys.Min]: string | null;
  [WklyPickerInputsPropertyKeys.Max]: string | null;
  [WklyPickerInputsPropertyKeys.IsDateDisabled]: WklyDisabledDatePredicate | null;
  [WklyPickerInputsPropertyKeys.IsTimeDisabled]: WklyDisabledTimePredicate | null;
  [WklyPickerInputsPropertyKeys.RangeValidator]: WklyRangeValidator | null;
  [WklyPickerInputsPropertyKeys.AllowRangeAcrossDisabled]: boolean;
  [WklyPickerInputsPropertyKeys.Required]: boolean;
  [WklyPickerInputsPropertyKeys.Disabled]: boolean;
  [WklyPickerInputsPropertyKeys.WeekLabelMode]: WklyWeekLabelMode;
  [WklyPickerInputsPropertyKeys.WeekLabelFormatter]: WklyWeekLabelFormatter | null;
  [WklyPickerInputsPropertyKeys.WeekCacheSize]: number;
  [WklyPickerInputsPropertyKeys.OverscanWeeks]: number;
  [WklyPickerInputsPropertyKeys.AriaLabel]: string | null;
  [WklyPickerInputsPropertyKeys.AriaDescribedBy]: string | null;
  [WklyPickerInputsPropertyKeys.InitialEpochDay]: number | null;
  [WklyPickerInputsPropertyKeys.CloseOnBackdrop]: boolean;
  [WklyPickerInputsPropertyKeys.Validators]: readonly ((
    value: WklyPickerValue,
  ) => WklyValidationError | null)[];
  [WklyPickerInputsPropertyKeys.Translations]: WklyTranslations | null;
}
export interface WklyPickerOutputs {
  [WklyPickerOutputsPropertyKeys.ValueChange]: unknown;
  [WklyPickerOutputsPropertyKeys.ValidationChange]: unknown;
  [WklyPickerOutputsPropertyKeys.Opened]: unknown;
  [WklyPickerOutputsPropertyKeys.Closed]: unknown;
  [WklyPickerOutputsPropertyKeys.ViewportChange]: unknown;
  [WklyPickerOutputsPropertyKeys.ViewModeChange]: unknown;
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
/** Regional entries override broader entries per key; catalog keys ignore case. */
export function resolveWklyTranslation(
  key: string,
  locale: string,
  catalog: WklyTranslations,
  overrides: WklyStrings = {},
): string {
  if (overrides[key]) return overrides[key];
  const entries = Object.keys(catalog);
  let candidate = locale.toLowerCase();
  while (candidate) {
    const match = entries.find((entry) => entry.toLowerCase() === candidate);
    if (match && catalog[match][key]) return catalog[match][key];
    const separator = candidate.lastIndexOf("-");
    candidate = separator < 0 ? "" : candidate.slice(0, separator);
  }
  return ENGLISH[key] || key;
}
export const INPUT_NAMES = [
  WklyPickerInputsPropertyKeys.Mode,
  WklyPickerInputsPropertyKeys.Value,
  WklyPickerInputsPropertyKeys.CalendarAdapter,
  WklyPickerInputsPropertyKeys.Locale,
  WklyPickerInputsPropertyKeys.WeekOffset,
  WklyPickerInputsPropertyKeys.ViewportPreset,
  WklyPickerInputsPropertyKeys.HourCycle,
  WklyPickerInputsPropertyKeys.ShowSeconds,
  WklyPickerInputsPropertyKeys.MinuteStep,
  WklyPickerInputsPropertyKeys.SecondStep,
  WklyPickerInputsPropertyKeys.Min,
  WklyPickerInputsPropertyKeys.Max,
  WklyPickerInputsPropertyKeys.IsDateDisabled,
  WklyPickerInputsPropertyKeys.IsTimeDisabled,
  WklyPickerInputsPropertyKeys.RangeValidator,
  WklyPickerInputsPropertyKeys.AllowRangeAcrossDisabled,
  WklyPickerInputsPropertyKeys.Required,
  WklyPickerInputsPropertyKeys.Disabled,
  WklyPickerInputsPropertyKeys.WeekLabelMode,
  WklyPickerInputsPropertyKeys.WeekLabelFormatter,
  WklyPickerInputsPropertyKeys.WeekCacheSize,
  WklyPickerInputsPropertyKeys.OverscanWeeks,
  WklyPickerInputsPropertyKeys.AriaLabel,
  WklyPickerInputsPropertyKeys.AriaDescribedBy,
  WklyPickerInputsPropertyKeys.InitialEpochDay,
  WklyPickerInputsPropertyKeys.CloseOnBackdrop,
  WklyPickerInputsPropertyKeys.Validators,
  WklyPickerInputsPropertyKeys.Translations,
] as const;
type AssertNever<T extends never> = T;
type _MissingInputNames = AssertNever<
  Exclude<keyof WklyPickerInputs, (typeof INPUT_NAMES)[number]>
>;
type _UnknownInputNames = AssertNever<
  Exclude<(typeof INPUT_NAMES)[number], keyof WklyPickerInputs>
>;
export { createWeekRows, WklyDayCell, WklyWeekRow } from "./week-rows";
export { validateDrafts, WklyDraft } from "./draft-validation";
