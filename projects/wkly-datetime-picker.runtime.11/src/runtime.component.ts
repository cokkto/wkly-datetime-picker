import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { FormControl } from "@angular/forms";
import { WklyDateTimePickerComponent } from "wkly-datetime-picker.11";
import {
  WklyCalendarAdapter,
  WklyGregorianCalendarAdapter,
  WklyPickerValue,
} from "wkly-datetime-picker.adapters";
import { floorMod } from "wkly-datetime-picker.core";
import { ShowcaseHebrewCalendarAdapter } from "../../wkly-datetime-picker.showcase/src/hebrew-adapter";
import {
  isRuntimeMessage,
  RuntimeConfig,
  RuntimeMessage,
} from "../../wkly-datetime-picker.showcase/src/runtime-protocol";

@Component({
  selector: "wkly-runtime",
  templateUrl: "./runtime.component.html",
})
export class RuntimeComponent implements OnInit, OnDestroy {
  @ViewChild("picker") picker?: WklyDateTimePickerComponent;
  config: RuntimeConfig | null = null;
  adapter: WklyCalendarAdapter = new WklyGregorianCalendarAdapter();
  value: WklyPickerValue = null;
  form = new FormControl(null);
  readonly unavailableDate = (day: number) => floorMod(day + 4, 7) === 0;
  readonly unavailableTime = (seconds: number) =>
    seconds >= 12 * 3600 && seconds < 13 * 3600;
  private readonly onMessage = (event: MessageEvent) => {
    if (
      event.source !== window.parent ||
      event.origin !== window.location.origin ||
      !isRuntimeMessage(event.data)
    )
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
      const next = message.payload as RuntimeConfig;
      if (
        !next ||
        typeof next !== "object" ||
        typeof next.locale !== "string" ||
        typeof next.mode !== "string"
      ) {
        this.send("wkly:error", "Invalid runtime configuration");
        return;
      }
      this.config = next;
      this.adapter =
        next.calendar === "hebrew"
          ? new ShowcaseHebrewCalendarAdapter(next.locale)
          : new WklyGregorianCalendarAdapter(next.locale);
      this.value = next.value as WklyPickerValue;
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
