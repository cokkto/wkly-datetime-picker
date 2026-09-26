import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from "@angular/core";
import { floorMod } from "wkly-datetime-picker.core";
import { normalizeDigits } from "wkly-datetime-picker.adapters";
@Component({
  standalone: false,
  selector: "wkly-field",
  template: `<div
    class="field"
    (wheel)="wheel($event)"
    (touchstart)="touchStart($event)"
    (touchmove)="touchMove($event)"
    (touchend)="touchEnd($event)"
    (touchcancel)="touchEnd($event)"
  >
    <span class="label">{{ label }}</span>
    <button
      type="button"
      [disabled]="disabled"
      [attr.aria-label]="label + ': previous'"
      (click)="stepBy(-1)"
    >
      {{ neighbor(-1) }}
    </button>
    <input
      [attr.aria-label]="label"
      [attr.aria-invalid]="invalid"
      [disabled]="disabled"
      [value]="display"
      [attr.inputmode]="labels ? 'text' : 'numeric'"
      autocomplete="off"
      (focus)="begin($event)"
      (input)="type($event)"
      (blur)="finish()"
      (keydown)="key($event)"
    />
    <button
      type="button"
      [disabled]="disabled"
      [attr.aria-label]="label + ': next'"
      (click)="stepBy(1)"
    >
      {{ neighbor(1) }}
    </button>
  </div>`,
  styles: [
    `
      .field {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        min-width: 0;
        text-align: center;
        touch-action: pan-x;
      }
      .label {
        font-size: 11px;
        color: var(--wkly-muted-color, #54616e);
        margin-bottom: 4px;
      }
      button,
      input {
        font: inherit;
        box-sizing: border-box;
        min-height: 44px;
        width: 100%;
        border: 0;
        text-align: center;
        background: transparent;
        color: inherit;
        border-radius: 7px;
      }
      button {
        color: var(--wkly-muted-color, #54616e);
        cursor: pointer;
      }
      input {
        font-size: 18px;
        font-weight: 650;
        background: var(--wkly-range-color, #e5f1ee);
        border-block: 2px solid var(--wkly-accent-color, #176c55);
      }
      input[aria-invalid="true"] {
        border-color: var(--wkly-error-color, #b42318);
      }
      :focus-visible {
        outline: 2px solid var(--wkly-focus-color, #124ee0);
        outline-offset: 1px;
      }
      button:disabled,
      input:disabled {
        opacity: 0.45;
      }
      button:hover:not(:disabled) {
        background: var(--wkly-range-color, #e5f1ee);
      }
    `,
  ],
})
export class WklyFieldComponent implements OnDestroy {
  @Input() value: number | null = 0;
  @Input() label = "";
  @Input() min = 0;
  @Input() max = 59;
  @Input() step = 1;
  @Input() locale = "en-US";
  @Input() disabled = false;
  @Input() invalid = false;
  @Input() labels: readonly string[] | null = null;
  @Output() valueChange = new EventEmitter<number | null>();
  @Output() complete = new EventEmitter<void>();
  private before: number | null = null;
  private touchY = 0;
  private touchSteps = 0;
  private touchChanged = false;
  private typed: string | null = null;
  private inputTimer: ReturnType<typeof setTimeout> | null = null;
  private wheelTimer: ReturnType<typeof setTimeout> | null = null;
  get display(): string {
    if (this.typed !== null) return this.typed;
    return this.value === null
      ? ""
      : this.labels
        ? this.labels[this.value - this.min] || String(this.value)
        : new Intl.NumberFormat(this.locale, {
            useGrouping: false,
            minimumIntegerDigits: this.max < 60 ? 2 : 1,
          }).format(this.value);
  }
  ngOnDestroy(): void {
    this.cancelInput();
    if (this.wheelTimer !== null) clearTimeout(this.wheelTimer);
  }
  next(delta: number): number {
    const count = Math.floor((this.max - this.min) / this.step) + 1;
    return (
      this.min +
      floorMod(
        Math.floor(
          ((this.value === null ? this.min : this.value) - this.min) /
            this.step,
        ) + delta,
        count,
      ) *
        this.step
    );
  }
  neighbor(delta: number): string {
    const n = this.next(delta);
    return this.labels
      ? this.labels[n - this.min] || ""
      : new Intl.NumberFormat(this.locale, { useGrouping: false }).format(n);
  }
  stepBy(delta: number): void {
    if (this.disabled) return;
    this.scrollBy(delta);
    this.complete.emit();
  }
  begin(event: FocusEvent): void {
    this.before = this.value;
    (event.target as HTMLInputElement).select();
  }
  type(event: Event): void {
    if (this.disabled) return;
    const input = event.target as HTMLInputElement;
    const raw = input.value;
    const numeric = Array.from(raw).every(
      (character) => normalizeDigits(character).length === 1,
    );
    if (numeric) {
      const normalized = normalizeDigits(raw);
      this.typed = input.value =
        this.min >= 0 && this.max < 100 ? normalized.slice(-2) : normalized;
      this.value = this.typed === "" ? null : Number(this.typed);
    } else if (this.labels) {
      const search = raw.trim().toLocaleLowerCase(this.locale);
      this.typed = raw;
      const matches = this.labels
        .map((label, index) => ({ label, index }))
        .filter((item) =>
          item.label.toLocaleLowerCase(this.locale).includes(search),
        );
      this.value = matches.length === 1 ? this.min + matches[0].index : null;
    } else {
      this.typed = input.value = normalizeDigits(raw);
      this.value = this.typed === "" ? null : Number(this.typed);
    }
    this.valueChange.emit(this.value);
    this.cancelInput();
    if (!numeric && this.labels && this.value !== null) this.complete.emit();
    this.inputTimer = setTimeout(() => {
      this.inputTimer = null;
      if (this.labels) this.typed = null;
      if (!this.disabled) this.complete.emit();
    }, 1000);
  }
  key(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.cancelInput();
      this.typed = null;
      this.value = this.before;
      this.valueChange.emit(this.before);
      (event.target as HTMLInputElement).value = this.display;
      (event.target as HTMLInputElement).blur();
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      this.finish();
    }
    const delta =
      event.key === "ArrowUp"
        ? -1
        : event.key === "ArrowDown"
          ? 1
          : event.key === "PageUp"
            ? -5
            : event.key === "PageDown"
              ? 5
              : 0;
    if (delta) {
      event.preventDefault();
      this.stepBy(delta);
    }
  }
  finish(): void {
    this.cancelInput();
    this.typed = null;
    this.complete.emit();
  }
  wheel(event: WheelEvent): void {
    if (this.disabled || Math.abs(event.deltaY) < 1) return;
    event.preventDefault();
    this.scrollBy(event.deltaY > 0 ? 1 : -1);
    if (this.wheelTimer !== null) clearTimeout(this.wheelTimer);
    this.wheelTimer = setTimeout(() => {
      this.wheelTimer = null;
      this.complete.emit();
    }, 140);
  }
  touchStart(event: TouchEvent): void {
    this.touchY = event.touches[0].clientY;
    this.touchSteps = 0;
    this.touchChanged = false;
  }
  touchMove(event: TouchEvent): void {
    this.applyTouchY(event.touches[0].clientY);
  }
  touchEnd(event: TouchEvent): void {
    this.applyTouchY(event.changedTouches[0].clientY);
    if (this.touchChanged) this.complete.emit();
    this.touchChanged = false;
  }
  private cancelInput(): void {
    if (this.inputTimer !== null) clearTimeout(this.inputTimer);
    this.inputTimer = null;
  }
  private scrollBy(delta: number): void {
    if (this.disabled || !delta) return;
    this.cancelInput();
    this.typed = null;
    this.value = this.next(delta);
    this.valueChange.emit(this.value);
  }
  private applyTouchY(y: number): void {
    if (this.disabled) return;
    const delta = this.touchY - y;
    const steps =
      Math.abs(delta) > 16
        ? Math.sign(delta) * Math.max(1, Math.round(Math.abs(delta) / 40))
        : 0;
    const change = steps - this.touchSteps;
    if (!change) return;
    this.scrollBy(change);
    this.touchSteps = steps;
    this.touchChanged = true;
  }
}
