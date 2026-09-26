import {
  Directive,
  InjectionToken,
  booleanAttribute,
  input,
  InputSignal,
  InputSignalWithTransform,
  output,
  OutputEmitterRef,
} from "@angular/core";
import { WklyWeekOffset } from "wkly-datetime-picker.core";
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
import {
  DEFAULT_OVERSCAN_WEEKS,
  WklyClock,
  WklyConfiguration,
  WklyCloseReason,
  WklyPickerInputs as WklyPickerInputsContract,
  WklyPickerOutputs as WklyPickerOutputsContract,
  WklyStrings,
  WklyTranslations,
  WklyViewportChange,
  WklyPickerInputsPropertyKeys,
  WklyPickerOutputsPropertyKeys,
} from "wkly-datetime-picker";
export * from "wkly-datetime-picker";
export const WKLY_CLOCK = new InjectionToken<WklyClock>("WKLY_CLOCK", {
  providedIn: "root",
  factory: () => ({ now: () => new Date() }),
});
export const WKLY_CONFIG = new InjectionToken<WklyConfiguration>(
  "WKLY_CONFIG",
  { providedIn: "root", factory: () => ({}) },
);
export const WKLY_LOCALIZATION = new InjectionToken<WklyStrings>(
  "WKLY_LOCALIZATION",
  { providedIn: "root", factory: () => ({}) },
);
export const WKLY_TRANSLATIONS = new InjectionToken<WklyTranslations>(
  "WKLY_TRANSLATIONS",
  { providedIn: "root", factory: () => ({}) },
);
/** Shared public inputs/outputs inherited by the picker and both trigger directives. */
export type WklyPickerSignalInputs<T> = {
  [K in keyof T]: InputSignal<T[K]> | InputSignalWithTransform<T[K], unknown>;
};
export type WklyPickerSignalOutputs<T> = {
  [K in keyof T]: OutputEmitterRef<T[K]>;
};
export type WklyPickerSignalInputsAndOutputs<T, U> = WklyPickerSignalInputs<T> &
  WklyPickerSignalOutputs<U>;
@Directive({
  // Angular's metadata evaluator requires strings; template expressions
  // preserve the enum as their source.
  outputs: [
    `${WklyPickerOutputsPropertyKeys.ValueChange}`,
    `${WklyPickerOutputsPropertyKeys.ValidationChange}`,
    `${WklyPickerOutputsPropertyKeys.Opened}`,
    `${WklyPickerOutputsPropertyKeys.Closed}`,
    `${WklyPickerOutputsPropertyKeys.ViewportChange}`,
    `${WklyPickerOutputsPropertyKeys.ViewModeChange}`,
  ],
})
export abstract class WklyPickerInputs implements WklyPickerSignalInputsAndOutputs<
  WklyPickerInputsContract,
  WklyPickerOutputsContract
> {
  // Angular discovers signal inputs from identifier property declarations.
  protected readonly modeInput = input<WklySelectionMode>("datetime", {
    alias: "mode",
  });
  protected readonly valueInput = input<WklyPickerValue>(null, {
    alias: "value",
  });
  protected readonly calendarAdapterInput = input<WklyCalendarAdapter>(
    undefined!,
    { alias: "calendarAdapter" },
  );
  protected readonly localeInput = input("", { alias: "locale" });
  protected readonly weekOffsetInput = input<WklyWeekOffset | null>(null, {
    alias: "weekOffset",
  });
  protected readonly viewportPresetInput = input<WklyViewportPreset>(
    { kind: "full-month" },
    { alias: "viewportPreset" },
  );
  protected readonly hourCycleInput = input<WklyHourCycle>("locale", {
    alias: "hourCycle",
  });
  protected readonly showSecondsInput = input(false, {
    alias: "showSeconds",
    transform: booleanAttribute,
  });
  protected readonly minuteStepInput = input(1, { alias: "minuteStep" });
  protected readonly secondStepInput = input(1, { alias: "secondStep" });
  protected readonly minInput = input<string | null>(null, { alias: "min" });
  protected readonly maxInput = input<string | null>(null, { alias: "max" });
  protected readonly isDateDisabledInput =
    input<WklyDisabledDatePredicate | null>(null, { alias: "isDateDisabled" });
  protected readonly isTimeDisabledInput =
    input<WklyDisabledTimePredicate | null>(null, { alias: "isTimeDisabled" });
  protected readonly rangeValidatorInput = input<WklyRangeValidator | null>(
    null,
    { alias: "rangeValidator" },
  );
  protected readonly allowRangeAcrossDisabledInput = input(false, {
    alias: "allowRangeAcrossDisabled",
    transform: booleanAttribute,
  });
  protected readonly requiredInput = input(false, {
    alias: "required",
    transform: booleanAttribute,
  });
  protected readonly disabledInput = input(false, {
    alias: "disabled",
    transform: booleanAttribute,
  });
  protected readonly weekLabelModeInput = input<WklyWeekLabelMode>("locale", {
    alias: "weekLabelMode",
  });
  protected readonly weekLabelFormatterInput =
    input<WklyWeekLabelFormatter | null>(null, { alias: "weekLabelFormatter" });
  protected readonly weekCacheSizeInput = input(256, {
    alias: "weekCacheSize",
  });
  protected readonly overscanWeeksInput = input(DEFAULT_OVERSCAN_WEEKS, {
    alias: "overscanWeeks",
  });
  protected readonly ariaLabelInput = input<string | null>(null, {
    alias: "ariaLabel",
  });
  protected readonly ariaDescribedByInput = input<string | null>(null, {
    alias: "ariaDescribedBy",
  });
  protected readonly initialEpochDayInput = input<number | null>(null, {
    alias: "initialEpochDay",
  });
  protected readonly closeOnBackdropInput = input(true, {
    alias: "closeOnBackdrop",
    transform: booleanAttribute,
  });
  protected readonly validatorsInput = input<
    readonly ((value: WklyPickerValue) => WklyValidationError | null)[]
  >([], { alias: "validators" });
  protected readonly translationsInput = input<WklyTranslations | null>(null, {
    alias: "translations",
  });
  // Public members of the shared picker input contract.
  readonly [WklyPickerInputsPropertyKeys.Mode] = this.modeInput;
  readonly [WklyPickerInputsPropertyKeys.Value] = this.valueInput;
  readonly [WklyPickerInputsPropertyKeys.CalendarAdapter] =
    this.calendarAdapterInput;
  readonly [WklyPickerInputsPropertyKeys.Locale] = this.localeInput;
  readonly [WklyPickerInputsPropertyKeys.WeekOffset] = this.weekOffsetInput;
  readonly [WklyPickerInputsPropertyKeys.ViewportPreset] =
    this.viewportPresetInput;
  readonly [WklyPickerInputsPropertyKeys.HourCycle] = this.hourCycleInput;
  readonly [WklyPickerInputsPropertyKeys.ShowSeconds] = this.showSecondsInput;
  readonly [WklyPickerInputsPropertyKeys.MinuteStep] = this.minuteStepInput;
  readonly [WklyPickerInputsPropertyKeys.SecondStep] = this.secondStepInput;
  readonly [WklyPickerInputsPropertyKeys.Min] = this.minInput;
  readonly [WklyPickerInputsPropertyKeys.Max] = this.maxInput;
  readonly [WklyPickerInputsPropertyKeys.IsDateDisabled] =
    this.isDateDisabledInput;
  readonly [WklyPickerInputsPropertyKeys.IsTimeDisabled] =
    this.isTimeDisabledInput;
  readonly [WklyPickerInputsPropertyKeys.RangeValidator] =
    this.rangeValidatorInput;
  readonly [WklyPickerInputsPropertyKeys.AllowRangeAcrossDisabled] =
    this.allowRangeAcrossDisabledInput;
  readonly [WklyPickerInputsPropertyKeys.Required] = this.requiredInput;
  readonly [WklyPickerInputsPropertyKeys.Disabled] = this.disabledInput;
  readonly [WklyPickerInputsPropertyKeys.WeekLabelMode] =
    this.weekLabelModeInput;
  readonly [WklyPickerInputsPropertyKeys.WeekLabelFormatter] =
    this.weekLabelFormatterInput;
  readonly [WklyPickerInputsPropertyKeys.WeekCacheSize] =
    this.weekCacheSizeInput;
  readonly [WklyPickerInputsPropertyKeys.OverscanWeeks] =
    this.overscanWeeksInput;
  readonly [WklyPickerInputsPropertyKeys.AriaLabel] = this.ariaLabelInput;
  readonly [WklyPickerInputsPropertyKeys.AriaDescribedBy] =
    this.ariaDescribedByInput;
  readonly [WklyPickerInputsPropertyKeys.InitialEpochDay] =
    this.initialEpochDayInput;
  readonly [WklyPickerInputsPropertyKeys.CloseOnBackdrop] =
    this.closeOnBackdropInput;
  readonly [WklyPickerInputsPropertyKeys.Validators] = this.validatorsInput;
  readonly [WklyPickerInputsPropertyKeys.Translations] = this.translationsInput;
  readonly [WklyPickerOutputsPropertyKeys.ValueChange] =
    output<WklyPickerValue>();
  readonly [WklyPickerOutputsPropertyKeys.ValidationChange] =
    output<readonly WklyValidationError[]>();
  readonly [WklyPickerOutputsPropertyKeys.Opened] = output<void>();
  readonly [WklyPickerOutputsPropertyKeys.Closed] = output<WklyCloseReason>();
  readonly [WklyPickerOutputsPropertyKeys.ViewportChange] =
    output<WklyViewportChange>();
  readonly [WklyPickerOutputsPropertyKeys.ViewModeChange] = output<
    "calendar" | "manual"
  >();
}
export function unwrapWklyPickerSignalInputs<
  T extends WklyPickerInputsContract,
>(source: WklyPickerSignalInputs<T>): T {
  const keys = Object.values(WklyPickerInputsPropertyKeys) as (keyof T)[];

  return Object.fromEntries(
    keys.map((key) => [key, source[key]()]),
  ) as unknown as T;
}
