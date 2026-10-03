import {
  Directive,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  ViewChild,
} from "@angular/core";
import { FormControl } from "@angular/forms";
import {
  WklyCalendarAdapter,
  WklyGregorianCalendarAdapter,
  WklyPickerValue,
} from "wkly-datetime-picker.adapters";
import { floorMod } from "wkly-datetime-picker.core";
import { ShowcaseHebrewCalendarAdapter } from "../../wkly-datetime-picker.showcase/src/hebrew-adapter";
import { RuntimeConfig, RuntimeMessage } from "./runtime-protocol";

@Directive()
export class RuntimeController implements OnChanges {
  @ViewChild("picker") picker?: {
    scrollToValue(value: string, options: { focus: boolean }): void;
  };
  @Input() config: RuntimeConfig | null = null;
  // Picker initialization can emit during a view check; update parent diagnostics afterwards.
  @Output() runtimeEvent = new EventEmitter<RuntimeMessage>(true);
  adapter: WklyCalendarAdapter = new WklyGregorianCalendarAdapter();
  value: WklyPickerValue = null;
  form = new FormControl(null as WklyPickerValue);
  readonly unavailableDate = (day: number) => floorMod(day + 4, 7) === 0;
  readonly unavailableTime = (seconds: number) =>
    seconds >= 12 * 3600 && seconds < 13 * 3600;
  ngOnChanges(): void {
    const next = this.config;
    if (next) {
      this.adapter =
        next.calendar === "hebrew"
          ? new ShowcaseHebrewCalendarAdapter(next.locale)
          : new WklyGregorianCalendarAdapter(next.locale);
      this.value = next.value as WklyPickerValue;
      // Host configuration should update the form without reporting a user edit.
      this.form.setValue(this.value, { emitEvent: false });
      if (next.disabled) this.form.disable({ emitEvent: false });
      else this.form.enable({ emitEvent: false });
      this.sendFormState();
    }
  }

  jump(value: string): void {
    this.picker?.scrollToValue(value, { focus: true });
  }

  send(type: string, payload?: unknown): void {
    this.runtimeEvent.emit({ type, payload });
  }
  onValue(value: WklyPickerValue): void {
    this.value = value;
    this.send("wkly:valueChange", value);
    this.sendFormState();
  }
  onValidation(errors: unknown): void {
    this.send("wkly:validationChange", JSON.parse(JSON.stringify(errors)));
    this.sendFormState();
  }
  onClosed(reason: string): void {
    this.send("wkly:closed", reason);
    this.sendFormState();
  }
  sendFormState(): void {
    Promise.resolve().then(() =>
      this.send("wkly:formState", {
        status: this.form.status,
        touched: this.form.touched,
      }),
    );
  }
}
