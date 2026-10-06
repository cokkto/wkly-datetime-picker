import { calendarAdapter } from "./calendars";
import { Directive, ViewChild } from "@angular/core";
import { FormControl, Validator } from "@angular/forms";
import {
  WklyDateTimePickerComponent,
  WklyTriggerBase,
} from "wkly-picker-under-test";
import type {
  FixtureSpec,
  HostEvent,
  HostSnapshot,
  PublicInputs,
} from "./protocol";
import type { WklyPickerInputs } from "wkly-datetime-picker";
@Directive()
export class FixtureController {
  @ViewChild("picker", { static: false }) picker!:
    WklyDateTimePickerComponent | WklyTriggerBase;
  presentation: FixtureSpec["presentation"] = "inline";
  form: FormControl = new FormControl(null);
  binding: "form" | "input" = "form";
  fixtureId = 0;
  private reflectValue = false;
  events: HostEvent[] = [];
  inputs: WklyPickerInputs = {
    mode: "datetime",
    value: null,
    calendarAdapter: undefined!,
    locale: "",
    weekOffset: null,
    viewportPreset: { kind: "full-month" },
    hourCycle: "locale",
    showSeconds: false,
    minuteStep: 1,
    secondStep: 1,
    min: null,
    max: null,
    isDateDisabled: null,
    isTimeDisabled: null,
    rangeValidator: null,
    allowRangeAcrossDisabled: false,
    required: false,
    disabled: false,
    weekLabelMode: "locale",
    weekLabelFormatter: null,
    weekCacheSize: 256,
    overscanWeeks: 3,
    ariaLabel: null,
    ariaDescribedBy: null,
    initialEpochDay: null,
    closeOnBackdrop: true,
    validators: [],
    translations: null,
  };
  initialize(spec: FixtureSpec, id: number): void {
    if (spec.disabledEpochDays) {
      const days = new Set(spec.disabledEpochDays);
      this.inputs.isDateDisabled = (day) => days.has(day);
    }
    this.presentation = spec.presentation || "inline";
    this.fixtureId = id;
    this.binding = spec.binding || "form";
    this.reflectValue = !!spec.reflectValue;
    this.patch(spec.inputs || {});
    if (spec.calendar)
      this.inputs.calendarAdapter = calendarAdapter(
        spec.calendar,
        this.inputs.locale || spec.config?.locale || "en-GB",
      );
    const value = spec.value === undefined ? this.inputs.value : spec.value;
    this.inputs.value = value;
    this.form = new FormControl(value);
  }
  close(): void {
    if (!("close" in this.picker))
      throw new Error("Inline fixtures cannot close");
    this.picker.close();
  }
  patch(inputs: PublicInputs): void {
    this.inputs = { ...this.inputs, ...inputs };
  }
  record(name: string, value?: unknown): void {
    this.events.push({
      fixtureId: this.fixtureId,
      name,
      value: value === undefined ? null : value,
    });
    if (name === "valueChange" && this.reflectValue) {
      // Like the showcase, reflect committed values through a fresh host configuration.
      Promise.resolve().then(() => {
        this.inputs = {
          ...this.inputs,
          value: value as WklyPickerInputs["value"],
          viewportPreset: { ...this.inputs.viewportPreset },
        };
      });
    }
  }
  get emissions(): number {
    return this.events.filter((event) => event.name === "valueChange").length;
  }
  snapshot(): HostSnapshot {
    return {
      value: this.form.value,
      errors: (this.picker as Validator).validate(
        this.form,
      ) as HostSnapshot["errors"],
      formErrors: this.form.errors,
      status: this.form.status,
      dirty: this.form.dirty,
      touched: this.form.touched,
      disabled: this.form.disabled,
      events: this.events.map((event) => ({ ...event })),
    };
  }
}
