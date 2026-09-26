import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { NgModule } from "@angular/core";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { WKLY_CLOCK, WklyDateTimePickerModule } from "wkly-datetime-picker.18";
import { WklyDateTimePickerOverlayModule } from "wkly-datetime-picker.18/cdk-overlay";
import { RuntimeComponent } from "./runtime.component";

declare const WKLY_E2E: boolean;

@NgModule({
  declarations: [RuntimeComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    WklyDateTimePickerModule,
    WklyDateTimePickerOverlayModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  providers: [
    ...(WKLY_E2E
      ? [
          {
            provide: WKLY_CLOCK,
            useValue: { now: () => new Date("2099-12-16T13:00:00.000Z") },
          },
        ]
      : []),
  ],
  bootstrap: [RuntimeComponent],
})
export class RuntimeModule {}
