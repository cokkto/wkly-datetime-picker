import {
  ApplicationRef,
  ComponentFactoryResolver,
  ComponentRef,
  Directive,
  ElementRef,
  forwardRef,
  HostListener,
  Inject,
  Injectable,
  Injector,
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
  WklyPickerInputsPropertyKeys,
  WklyPickerOutputsPropertyKeys,
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
    private resolver: ComponentFactoryResolver,
    private injector: Injector,
    private app: ApplicationRef,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platform: Object,
  ) {}
  open(
    trigger: HTMLElement,
    onCancel: (reason: WklyCloseReason) => void,
    backdrop = true,
    injector?: Injector,
  ): WklyPresentationRef {
    if (!isPlatformBrowser(this.platform))
      throw new Error("Picker presentations can only open in a browser");
    const dialog = this.document.createElement(
      "dialog",
    ) as HTMLDialogElement & {
      showModal(): void;
      close(): void;
    };
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
    const component = this.resolver
      .resolveComponentFactory(WklyDateTimePickerComponent)
      .create(injector || this.injector);
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
    if (this[WklyPickerInputsPropertyKeys.Disabled] || this.ref) return;
    this.ref = this.create();
    const picker = this.ref.component.instance;
    this.copy();
    this.subscriptions = [
      picker[WklyPickerOutputsPropertyKeys.ValueChange].subscribe((value) => {
        this[WklyPickerInputsPropertyKeys.Value] = value;
        this.change(value);
        this[WklyPickerOutputsPropertyKeys.ValueChange].emit(value);
        this.display();
      }),
      picker[WklyPickerOutputsPropertyKeys.ValidationChange].subscribe(
        (errors) => {
          this.errors = errors;
          this[WklyPickerOutputsPropertyKeys.ValidationChange].emit(errors);
          this.validation();
        },
      ),
      picker[WklyPickerOutputsPropertyKeys.Closed].subscribe((reason) =>
        this.close(reason),
      ),
      picker[WklyPickerOutputsPropertyKeys.ViewportChange].subscribe((value) =>
        this[WklyPickerOutputsPropertyKeys.ViewportChange].emit(value),
      ),
      picker[WklyPickerOutputsPropertyKeys.ViewModeChange].subscribe((value) =>
        this[WklyPickerOutputsPropertyKeys.ViewModeChange].emit(value),
      ),
    ];
    this.ref.component.changeDetectorRef.detectChanges();
    picker.focusDay();
    this[WklyPickerOutputsPropertyKeys.Opened].emit();
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
    this[WklyPickerOutputsPropertyKeys.Closed].emit(reason);
  }
  ngOnChanges(): void {
    [
      WklyPickerInputsPropertyKeys.ShowSeconds,
      WklyPickerInputsPropertyKeys.AllowRangeAcrossDisabled,
      WklyPickerInputsPropertyKeys.Required,
      WklyPickerInputsPropertyKeys.Disabled,
      WklyPickerInputsPropertyKeys.CloseOnBackdrop,
    ].forEach(
      (key) => ((this as any)[key] = coerceBoolean((this as any)[key])),
    );
    this.checkValue();
    this.display();
    if (this.ref) {
      this.copy();
      this.ref.component.instance.ngOnChanges({
        [WklyPickerInputsPropertyKeys.Value]: true,
      });
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
      const value = this[WklyPickerInputsPropertyKeys.Value];
      host.value =
        value === null
          ? ""
          : typeof value === "string"
            ? value
            : value.join(" — ");
      host.disabled = this[WklyPickerInputsPropertyKeys.Disabled];
      host.setAttribute("aria-haspopup", "dialog");
    }
  }
  private checkValue(): void {
    this.errors = validateSelection(
      this[WklyPickerInputsPropertyKeys.Value],
      this,
      this[WklyPickerInputsPropertyKeys.CalendarAdapter] ||
        new WklyGregorianCalendarAdapter(
          this[WklyPickerInputsPropertyKeys.Locale] || "en-US",
        ),
    );
    this[WklyPickerOutputsPropertyKeys.ValidationChange].emit(this.errors);
    this.validation();
  }
  writeValue(value: WklyPickerValue): void {
    this[WklyPickerInputsPropertyKeys.Value] = value;
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
    this[WklyPickerInputsPropertyKeys.Disabled] = value;
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
    private triggerInjector: Injector,
  ) {
    super(element);
  }
  protected create(): WklyPresentationRef {
    return this.service.open(
      this.element.nativeElement,
      (reason) => this.close(reason),
      this[WklyPickerInputsPropertyKeys.CloseOnBackdrop],
      this.triggerInjector,
    );
  }
}
