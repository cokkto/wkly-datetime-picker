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
  WklyStrings,
  WklyTranslations,
  WklyViewportChange,
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
@Directive()
export abstract class WklyPickerInputs implements WklyPickerInputsContract {
  @Input() mode: WklySelectionMode = "datetime";
  @Input() value: WklyPickerValue = null;
  @Input() calendarAdapter!: WklyCalendarAdapter;
  @Input() locale = "";
  @Input() weekOffset: WklyWeekOffset | null = null;
  @Input() viewportPreset: WklyViewportPreset = { kind: "full-month" };
  @Input() hourCycle: WklyHourCycle = "locale";
  @Input() showSeconds = false;
  @Input() minuteStep = 1;
  @Input() secondStep = 1;
  @Input() min: string | null = null;
  @Input() max: string | null = null;
  @Input() isDateDisabled: WklyDisabledDatePredicate | null = null;
  @Input() isTimeDisabled: WklyDisabledTimePredicate | null = null;
  @Input() rangeValidator: WklyRangeValidator | null = null;
  @Input() allowRangeAcrossDisabled = false;
  @Input() required = false;
  @Input() disabled = false;
  @Input() weekLabelMode: WklyWeekLabelMode = "locale";
  @Input() weekLabelFormatter: WklyWeekLabelFormatter | null = null;
  @Input() weekCacheSize = 256;
  @Input() overscanWeeks = DEFAULT_OVERSCAN_WEEKS;
  @Input() ariaLabel: string | null = null;
  @Input() ariaDescribedBy: string | null = null;
  @Input() initialEpochDay: number | null = null;
  @Input() closeOnBackdrop = true;
  @Input() validators: readonly ((
    value: WklyPickerValue,
  ) => WklyValidationError | null)[] = [];
  @Input() translations: WklyTranslations | null = null;
  @Output() valueChange = new EventEmitter<WklyPickerValue>();
  @Output() validationChange = new EventEmitter<readonly WklyValidationError[]>(
    true,
  );
  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<WklyCloseReason>();
  @Output() viewportChange = new EventEmitter<WklyViewportChange>(true);
  @Output() viewModeChange = new EventEmitter<"calendar" | "manual">();
}
