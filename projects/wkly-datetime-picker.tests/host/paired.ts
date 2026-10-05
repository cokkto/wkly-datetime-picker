import { Component, NgModule, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WklyDateTimePickerModule } from "wkly-picker-under-test";
import { WklyPickerValue } from "wkly-datetime-picker.adapters";
import { FixtureController } from "./fixture";
import { calendarAdapter } from "./calendars";
@Component({
  selector: "test-fixture",
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<section
    *ngFor="let adapter of adapters"
    [attr.data-calendar]="adapter.calendarId"
  >
    <wkly-datetime-picker
      #picker
      mode="date"
      locale="en-GB"
      [value]="form.value"
      [calendarAdapter]="adapter"
      (valueChange)="synchronize($event)"
    ></wkly-datetime-picker>
  </section>`,
  styles: [
    `
      :host {
        display: flex;
        gap: 8px;
      }
      section {
        width: 390px;
      }
    `,
  ],
})
export class PairedFixture extends FixtureController {
  readonly adapters = [
    calendarAdapter("gregorian", "en-GB"),
    calendarAdapter("hebrew", "en-GB"),
    calendarAdapter("hijri", "en-GB"),
  ];
  synchronize(value: WklyPickerValue): void {
    // Public value bindings distribute the originating picker's committed UTC value.
    this.form.setValue(value);
    this.record("valueChange", value);
  }
}
@NgModule({
  declarations: [PairedFixture],
  imports: [CommonModule, WklyDateTimePickerModule],
})
export class PairedFixtureModule {}
