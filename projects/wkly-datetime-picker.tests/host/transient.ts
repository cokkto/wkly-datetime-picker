import { Component, NgModule, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { WklyDateTimePickerModule } from "wkly-picker-under-test";
import { WklyDateTimePickerOverlayModule } from "wkly-overlay-under-test";
import { FixtureController } from "./fixture";
@Component({
  selector: "test-fixture",
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<ng-container *ngIf="presentation === 'native'"
      ><input
        data-testid="trigger"
        aria-label="Choose date and time"
        wklyDateTimePickerDialog
        #picker="wklyDialog"
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
        [formControl]="form" /></ng-container
    ><ng-container *ngIf="presentation === 'cdk'"
      ><input
        data-testid="trigger"
        aria-label="Choose date and time"
        wklyDateTimePickerOverlay
        #picker="wklyOverlay"
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
        [formControl]="form" /></ng-container
    ><ng-container *ngIf="presentation === 'material'"
      ><mat-form-field appearance="outline" floatLabel="always"
        ><mat-label>Choose date and time</mat-label
        ><input
          data-testid="trigger"
          aria-label="Choose date and time"
          matInput
          readonly
          wklyDateTimePickerOverlay
          #picker="wklyOverlay"
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
          [formControl]="form" /></mat-form-field
    ></ng-container>`,
})
export class TransientFixture extends FixtureController {}
@NgModule({
  declarations: [TransientFixture],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    WklyDateTimePickerModule,
    WklyDateTimePickerOverlayModule,
    MatFormFieldModule,
    MatInputModule,
  ],
})
export class TransientFixtureModule {}
