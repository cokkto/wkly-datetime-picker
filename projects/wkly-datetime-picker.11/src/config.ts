import {
  Directive,
  EventEmitter,
  InjectionToken,
  Input,
  Output,
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
// Angular 11 consumers need literal names in published decorator metadata.
@Directive({
  inputs: [
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
  ],
  outputs: [
    "valueChange",
    "validationChange",
    "opened",
    "closed",
    "viewportChange",
    "viewModeChange",
  ],
})
export abstract class WklyPickerInputs
  implements WklyPickerInputsContract, WklyPickerOutputsContract
{
  @Input() [WklyPickerInputsPropertyKeys.Mode]: WklySelectionMode = "datetime";
  @Input() [WklyPickerInputsPropertyKeys.Value]: WklyPickerValue = null;
  @Input() [WklyPickerInputsPropertyKeys.CalendarAdapter]: WklyCalendarAdapter;
  @Input() [WklyPickerInputsPropertyKeys.Locale]: string = "";
  @Input() [WklyPickerInputsPropertyKeys.WeekOffset]: WklyWeekOffset | null =
    null;
  @Input() [WklyPickerInputsPropertyKeys.ViewportPreset]: WklyViewportPreset = {
    kind: "full-month",
  };
  @Input() [WklyPickerInputsPropertyKeys.HourCycle]: WklyHourCycle = "locale";
  @Input() [WklyPickerInputsPropertyKeys.ShowSeconds]: boolean = false;
  @Input() [WklyPickerInputsPropertyKeys.MinuteStep]: number = 1;
  @Input() [WklyPickerInputsPropertyKeys.SecondStep]: number = 1;
  @Input() [WklyPickerInputsPropertyKeys.Min]: string | null = null;
  @Input() [WklyPickerInputsPropertyKeys.Max]: string | null = null;
  @Input()
  [WklyPickerInputsPropertyKeys.IsDateDisabled]: WklyDisabledDatePredicate | null =
    null;
  @Input()
  [WklyPickerInputsPropertyKeys.IsTimeDisabled]: WklyDisabledTimePredicate | null =
    null;
  @Input()
  [WklyPickerInputsPropertyKeys.RangeValidator]: WklyRangeValidator | null =
    null;
  @Input() [WklyPickerInputsPropertyKeys.AllowRangeAcrossDisabled] = false;
  @Input() [WklyPickerInputsPropertyKeys.Required] = false;
  @Input() [WklyPickerInputsPropertyKeys.Disabled] = false;
  @Input() [WklyPickerInputsPropertyKeys.WeekLabelMode]: WklyWeekLabelMode =
    "locale";
  @Input()
  [WklyPickerInputsPropertyKeys.WeekLabelFormatter]: WklyWeekLabelFormatter | null =
    null;
  @Input() [WklyPickerInputsPropertyKeys.WeekCacheSize] = 256;
  @Input() [WklyPickerInputsPropertyKeys.OverscanWeeks] =
    DEFAULT_OVERSCAN_WEEKS;
  @Input() [WklyPickerInputsPropertyKeys.AriaLabel]: string | null = null;
  @Input() [WklyPickerInputsPropertyKeys.AriaDescribedBy]: string | null = null;
  @Input() [WklyPickerInputsPropertyKeys.InitialEpochDay]: number | null = null;
  @Input() [WklyPickerInputsPropertyKeys.CloseOnBackdrop] = true;
  @Input() [WklyPickerInputsPropertyKeys.Validators]: readonly ((
    value: WklyPickerValue,
  ) => WklyValidationError | null)[] = [];
  @Input()
  [WklyPickerInputsPropertyKeys.Translations]: WklyTranslations | null = null;
  @Output() [WklyPickerOutputsPropertyKeys.ValueChange] =
    new EventEmitter<WklyPickerValue>();
  @Output() [WklyPickerOutputsPropertyKeys.ValidationChange] = new EventEmitter<
    readonly WklyValidationError[]
  >(true);
  @Output() [WklyPickerOutputsPropertyKeys.Opened] = new EventEmitter<void>();
  @Output() [WklyPickerOutputsPropertyKeys.Closed] =
    new EventEmitter<WklyCloseReason>();
  @Output() [WklyPickerOutputsPropertyKeys.ViewportChange] =
    new EventEmitter<WklyViewportChange>(true);
  @Output() [WklyPickerOutputsPropertyKeys.ViewModeChange] = new EventEmitter<
    "calendar" | "manual"
  >();
}
