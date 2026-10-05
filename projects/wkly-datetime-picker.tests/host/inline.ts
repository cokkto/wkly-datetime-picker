import { Component, NgModule, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { WklyDateTimePickerModule } from "wkly-picker-under-test";
import { FixtureController } from "./fixture";
@Component({
  selector: "test-fixture",
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<wkly-datetime-picker
      #picker
      [mode]="inputs.mode"
      [value]="inputs.value"
      [calendarAdapter]="inputs.calendarAdapter"
      [locale]="inputs.locale"
      [weekOffset]="inputs.weekOffset"
      [viewportPreset]="inputs.viewportPreset"
      [hourCycle]="inputs.hourCycle"
      [showSeconds]="inputs.showSeconds"
      [minuteStep]="inputs.minuteStep"
      [secondStep]="inputs.secondStep"
      [min]="inputs.min"
      [max]="inputs.max"
      [isDateDisabled]="inputs.isDateDisabled"
      [isTimeDisabled]="inputs.isTimeDisabled"
      [rangeValidator]="inputs.rangeValidator"
      [allowRangeAcrossDisabled]="inputs.allowRangeAcrossDisabled"
      [required]="inputs.required"
      [disabled]="inputs.disabled"
      [weekLabelMode]="inputs.weekLabelMode"
      [weekLabelFormatter]="inputs.weekLabelFormatter"
      [weekCacheSize]="inputs.weekCacheSize"
      [overscanWeeks]="inputs.overscanWeeks"
      [ariaLabel]="inputs.ariaLabel"
      [ariaDescribedBy]="inputs.ariaDescribedBy"
      [initialEpochDay]="inputs.initialEpochDay"
      [closeOnBackdrop]="inputs.closeOnBackdrop"
      [validators]="inputs.validators"
      [translations]="inputs.translations"
      (valueChange)="record('valueChange', $event)"
      (validationChange)="record('validationChange', $event)"
      (opened)="record('opened', $event)"
      (closed)="record('closed', $event)"
      (viewportChange)="record('viewportChange', $event)"
      (viewModeChange)="record('viewModeChange', $event)"
      [formControl]="form"
      *ngIf="binding === 'form'"
    ></wkly-datetime-picker
    ><wkly-datetime-picker
      #picker
      [mode]="inputs.mode"
      [value]="inputs.value"
      [calendarAdapter]="inputs.calendarAdapter"
      [locale]="inputs.locale"
      [weekOffset]="inputs.weekOffset"
      [viewportPreset]="inputs.viewportPreset"
      [hourCycle]="inputs.hourCycle"
      [showSeconds]="inputs.showSeconds"
      [minuteStep]="inputs.minuteStep"
      [secondStep]="inputs.secondStep"
      [min]="inputs.min"
      [max]="inputs.max"
      [isDateDisabled]="inputs.isDateDisabled"
      [isTimeDisabled]="inputs.isTimeDisabled"
      [rangeValidator]="inputs.rangeValidator"
      [allowRangeAcrossDisabled]="inputs.allowRangeAcrossDisabled"
      [required]="inputs.required"
      [disabled]="inputs.disabled"
      [weekLabelMode]="inputs.weekLabelMode"
      [weekLabelFormatter]="inputs.weekLabelFormatter"
      [weekCacheSize]="inputs.weekCacheSize"
      [overscanWeeks]="inputs.overscanWeeks"
      [ariaLabel]="inputs.ariaLabel"
      [ariaDescribedBy]="inputs.ariaDescribedBy"
      [initialEpochDay]="inputs.initialEpochDay"
      [closeOnBackdrop]="inputs.closeOnBackdrop"
      [validators]="inputs.validators"
      [translations]="inputs.translations"
      (valueChange)="record('valueChange', $event)"
      (validationChange)="record('validationChange', $event)"
      (opened)="record('opened', $event)"
      (closed)="record('closed', $event)"
      (viewportChange)="record('viewportChange', $event)"
      (viewModeChange)="record('viewModeChange', $event)"
      *ngIf="binding === 'input'"
    ></wkly-datetime-picker
    ><output data-testid="value">{{ form.value | json }}</output
    ><output data-testid="emissions">{{ emissions }}</output>`,
})
export class Fixture extends FixtureController {}
@NgModule({
  declarations: [Fixture],
  imports: [CommonModule, ReactiveFormsModule, WklyDateTimePickerModule],
})
export class FixtureModule {}
