import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WklyDateTimePickerComponent } from "./picker.component";
import { WklyDateTimePickerDialogDirective } from "./presentation";
import { WklyFieldComponent } from "./field.component";
export * from "./config";
export { WklyDateTimePickerComponent } from "./picker.component";
export {
  WklyPresentationRef,
  WklyDateTimePickerDialogService,
  WklyTriggerBase,
  WklyDateTimePickerDialogDirective,
} from "./presentation";
export { WklyFieldComponent } from "./field.component";
export {
  WklyPickerValue,
  WklyIsoString,
  WklyRangeValue,
  WklySelectionMode,
  WklyValidationError,
  WklyValidationErrorCode,
  WklyViewportPreset,
  WklyHourCycle,
  WklyEndpoint,
  WklyDisabledDatePredicate,
  WklyDisabledTimePredicate,
  WklyRangeValidator,
  WklyWeekLabelMode,
  WklyWeekLabelFormatter,
} from "wkly-datetime-picker.adapters";
@NgModule({
  imports: [CommonModule],
  declarations: [
    WklyDateTimePickerComponent,
    WklyDateTimePickerDialogDirective,
    WklyFieldComponent,
  ],
  exports: [WklyDateTimePickerComponent, WklyDateTimePickerDialogDirective],
})
export class WklyDateTimePickerModule {}
