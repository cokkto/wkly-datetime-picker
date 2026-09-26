import {
  ApplicationRef,
  ComponentRef,
  createComponent,
  Directive,
  ElementRef,
  EnvironmentInjector,
  forwardRef,
  HostListener,
  Inject,
  Injectable,
  OnChanges,
  OnDestroy,
  Optional,
  PLATFORM_ID,
} from "@angular/core";
import { DOCUMENT, isPlatformBrowser } from "@angular/common";
import {
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from "@angular/forms";
import {
  validateSelection,
  WklyGregorianCalendarAdapter,
  WklyCalendarDate,
  WklyPickerValue,
  WklyValidationError,
} from "wkly-datetime-picker.adapters";
import { Subscription } from "rxjs";
import {
  coerceBoolean,
  INPUT_NAMES,
  WklyCloseReason,
  WklyJumpOptions,
  WklyPickerInputs,
} from "./config";
import { WklyDateTimePickerComponent } from "./picker.component";
export interface WklyPresentationRef {
  readonly component: ComponentRef<WklyDateTimePickerComponent>;
  destroy(): void;
}
/** Native-dialog factory. Browser resources are allocated only by open(). */
@Injectable({ providedIn: "root" })
export class WklyDateTimePickerDialogService {
  constructor(
    private environmentInjector: EnvironmentInjector,
    private app: ApplicationRef,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platform: Object,
  ) {}
  open(
    trigger: HTMLElement,
    onCancel: (reason: WklyCloseReason) => void,
    backdrop = true,
  ): WklyPresentationRef {
    if (!isPlatformBrowser(this.platform))
      throw new Error("Picker presentations can only open in a browser");
    const dialog = this.document.createElement("dialog");
    dialog.setAttribute("aria-label", "Date and time picker");
    Object.assign(dialog.style, {
      padding: "0",
      border: "0",
      borderRadius: "14px",
      width: "min(390px, 100vw)",
      maxWidth: "100vw",
      maxHeight: "94vh",
      background: "transparent",
    });
    const component = createComponent(WklyDateTimePickerComponent, {
      environmentInjector: this.environmentInjector,
    });
    component.instance.presentation = "transient";
    dialog.appendChild(component.location.nativeElement);
    this.document.body.appendChild(dialog);
    this.app.attachView(component.hostView);
    const cancel = (event: Event) => {
      event.preventDefault();
      onCancel("escape");
    };
    const click = (event: MouseEvent) => {
      if (backdrop && event.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        )
          onCancel("backdrop");
      }
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),[tabindex="0"]',
        ),
      ).filter(
        (el) =>
          el.tabIndex >= 0 &&
          el.getClientRects().length &&
          getComputedStyle(el).visibility !== "hidden",
      );
      const first = controls[0],
        last = controls[controls.length - 1];
      if (
        first &&
        (event.shiftKey
          ? this.document.activeElement === first
          : this.document.activeElement === last)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    dialog.addEventListener("cancel", cancel);
    dialog.addEventListener("click", click);
    dialog.addEventListener("keydown", keydown);
    dialog.showModal();
    return {
      component,
      destroy: () => {
        dialog.removeEventListener("cancel", cancel);
        dialog.removeEventListener("click", click);
        dialog.removeEventListener("keydown", keydown);
        dialog.close();
        this.app.detachView(component.hostView);
        component.destroy();
        dialog.remove();
        trigger.focus();
      },
    };
  }
}
/** Shared trigger lifecycle; optional presentation packages extend this class. */
@Directive()
export abstract class WklyTriggerBase
  extends WklyPickerInputs
  implements ControlValueAccessor, Validator, OnChanges, OnDestroy
{
  protected ref: WklyPresentationRef | null = null;
  protected subscriptions: Subscription[] = [];
  private errors: readonly WklyValidationError[] = [];
  private change: (value: WklyPickerValue) => void = () => {};
  private touched: () => void = () => {};
  private validation: () => void = () => {};
  constructor(protected element: ElementRef<HTMLElement>) {
    super();
  }
  protected abstract create(): WklyPresentationRef;
  @HostListener("click") open(): void {
    if (this.disabled || this.ref) return;
    this.ref = this.create();
    const picker = this.ref.component.instance;
    this.copy();
    this.subscriptions = [
      picker.valueChange.subscribe((value) => {
        this.value = value;
        this.change(value);
        this.valueChange.emit(value);
        this.display();
      }),
      picker.validationChange.subscribe((errors) => {
        this.errors = errors;
        this.validationChange.emit(errors);
        this.validation();
      }),
      picker.closed.subscribe((reason) => this.close(reason)),
      picker.viewportChange.subscribe((value) =>
        this.viewportChange.emit(value),
      ),
      picker.viewModeChange.subscribe((value) =>
        this.viewModeChange.emit(value),
      ),
    ];
    this.ref.component.changeDetectorRef.detectChanges();
    picker.focusDay();
    this.opened.emit();
  }
  @HostListener("keydown", ["$event"]) key(event: KeyboardEvent): void {
    if (
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "ArrowDown"
    ) {
      event.preventDefault();
      this.open();
    }
  }
  @HostListener("blur") blur(): void {
    this.touched();
  }
  close(reason: WklyCloseReason = "programmatic"): void {
    if (!this.ref) return;
    const ref = this.ref;
    this.ref = null;
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];
    ref.destroy();
    this.touched();
    this.closed.emit(reason);
  }
  ngOnChanges(): void {
    [
      "showSeconds",
      "allowRangeAcrossDisabled",
      "required",
      "disabled",
      "closeOnBackdrop",
    ].forEach(
      (key) => ((this as any)[key] = coerceBoolean((this as any)[key])),
    );
    this.checkValue();
    this.display();
    if (this.ref) {
      this.copy();
      this.ref.component.instance.ngOnChanges({ value: true });
      this.ref.component.changeDetectorRef.detectChanges();
    }
  }
  ngOnDestroy(): void {
    this.close();
  }
  private copy(): void {
    if (this.ref)
      for (const name of INPUT_NAMES)
        (this.ref.component.instance as any)[name] = (this as any)[name];
  }
  private display(): void {
    const host = this.element.nativeElement as HTMLInputElement;
    if (host.tagName === "INPUT") {
      host.readOnly = true;
      host.value =
        this.value === null
          ? ""
          : typeof this.value === "string"
            ? this.value
            : this.value.join(" — ");
      host.disabled = this.disabled;
      host.setAttribute("aria-haspopup", "dialog");
    }
  }
  private checkValue(): void {
    this.errors = validateSelection(
      this.value,
      this,
      this.calendarAdapter ||
        new WklyGregorianCalendarAdapter(this.locale || "en-US"),
    );
    this.validationChange.emit(this.errors);
    this.validation();
  }
  writeValue(value: WklyPickerValue): void {
    this.value = value;
    this.checkValue();
    this.display();
    if (this.ref) this.ref.component.instance.writeValue(value);
  }
  registerOnChange(fn: (value: WklyPickerValue) => void): void {
    this.change = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.touched = fn;
  }
  setDisabledState(value: boolean): void {
    this.disabled = value;
    this.display();
    if (this.ref) this.ref.component.instance.setDisabledState(value);
  }
  validate(): ValidationErrors | null {
    return this.errors.length ? { wkly: this.errors } : null;
  }
  registerOnValidatorChange(fn: () => void): void {
    this.validation = fn;
  }
  scrollToEpochDay(day: number, options?: WklyJumpOptions): void {
    this.open();
    this.ref?.component.instance.scrollToEpochDay(day, options);
  }
  scrollToAbsoluteWeek(week: number, options?: WklyJumpOptions): void {
    this.open();
    this.ref?.component.instance.scrollToAbsoluteWeek(week, options);
  }
  scrollToCalendarDate(
    date: WklyCalendarDate,
    options?: WklyJumpOptions,
  ): void {
    this.open();
    this.ref?.component.instance.scrollToCalendarDate(date, options);
  }
  scrollToValue(value: string, options?: WklyJumpOptions): void {
    this.open();
    this.ref?.component.instance.scrollToValue(value, options);
  }
}
@Directive({
  selector: "[wklyDateTimePickerDialog]",
  standalone: false,
  exportAs: "wklyDialog",
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => WklyDateTimePickerDialogDirective),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => WklyDateTimePickerDialogDirective),
      multi: true,
    },
  ],
})
export class WklyDateTimePickerDialogDirective extends WklyTriggerBase {
  constructor(
    element: ElementRef<HTMLElement>,
    private service: WklyDateTimePickerDialogService,
  ) {
    super(element);
  }
  protected create(): WklyPresentationRef {
    return this.service.open(
      this.element.nativeElement,
      (reason) => this.close(reason),
      this.closeOnBackdrop,
    );
  }
}
