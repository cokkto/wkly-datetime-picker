import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { FormControl } from "@angular/forms";
import { WklyDateTimePickerComponent } from "wkly-datetime-picker.21";
import {
  WklyCalendarAdapter,
  WklyGregorianCalendarAdapter,
  WklyPickerValue,
} from "wkly-datetime-picker.adapters";
import { floorMod } from "wkly-datetime-picker.core";
import { ShowcaseHebrewCalendarAdapter } from "../../wkly-datetime-picker.showcase/src/hebrew-adapter";
import {
  isExpectedRuntimeMessage,
  isRuntimeConfig,
  RuntimeConfig,
  RuntimeMessage,
} from "../../wkly-datetime-picker.runtime/src/runtime-protocol";

@Component({
  selector: "wkly-runtime",
  standalone: false,
  templateUrl: "./runtime.component.html",
})
export class RuntimeComponent implements OnInit, OnDestroy {
  @ViewChild("picker") picker?: WklyDateTimePickerComponent;
  config: RuntimeConfig | null = null;
  adapter: WklyCalendarAdapter = new WklyGregorianCalendarAdapter();
  value: WklyPickerValue = null;
  form = new FormControl<WklyPickerValue>(null);
  readonly unavailableDate = (day: number) => floorMod(day + 4, 7) === 0;
  readonly unavailableTime = (seconds: number) =>
    seconds >= 12 * 3600 && seconds < 13 * 3600;
  private readonly onMessage = (event: MessageEvent) => {
    // The iframe shares an origin with the host, so source identity is required too.
    if (!isExpectedRuntimeMessage(event, window.parent, window.location.origin))
      return;
    this.zone.run(() => this.receive(event.data));
  };

  constructor(
    private zone: NgZone,
    private changes: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    window.addEventListener("message", this.onMessage);
  }
  ngOnDestroy(): void {
    window.removeEventListener("message", this.onMessage);
  }

  private receive(message: RuntimeMessage): void {
    if (message.type === "wkly:configure") {
      const next = message.payload;
      if (!isRuntimeConfig(next)) {
        this.send("wkly:error", "Invalid runtime configuration");
        return;
      }
      this.config = next;
      this.adapter =
        next.calendar === "hebrew"
          ? new ShowcaseHebrewCalendarAdapter(next.locale)
          : new WklyGregorianCalendarAdapter(next.locale);
      this.value = next.value as WklyPickerValue;
      // Host configuration should update the form without reporting a user edit.
      this.form.setValue(this.value, { emitEvent: false });
      if (next.disabled) this.form.disable({ emitEvent: false });
      else this.form.enable({ emitEvent: false });
      this.changes.detectChanges();
      this.sendFormState();
      requestAnimationFrame(() =>
        this.send("wkly:height", Math.max(480, document.body.scrollHeight)),
      );
    } else if (
      message.type === "wkly:jump" &&
      typeof message.payload === "string"
    ) {
      this.picker?.scrollToValue(message.payload, { focus: true });
    }
  }

  send(type: string, payload?: unknown): void {
    window.parent.postMessage({ type, payload }, window.location.origin);
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
