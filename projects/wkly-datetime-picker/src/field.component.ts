import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { floorMod } from 'wkly-datetime-picker.core';
import { normalizeDigits } from 'wkly-datetime-picker.adapters';
@Component({
  selector: 'wkly-field',
  template: `<div class="field" (wheel)="wheel($event)" (touchstart)="touchStart($event)" (touchend)="touchEnd($event)">
    <span class="label">{{label}}</span>
    <button type="button" [disabled]="disabled" [attr.aria-label]="label + ': previous'" (click)="stepBy(-1)">{{neighbor(-1)}}</button>
    <input [attr.aria-label]="label" [attr.aria-invalid]="invalid" [disabled]="disabled" [value]="display" inputmode="numeric" autocomplete="off" (focus)="begin($event)" (input)="type($event)" (blur)="complete.emit()" (keydown)="key($event)" />
    <button type="button" [disabled]="disabled" [attr.aria-label]="label + ': next'" (click)="stepBy(1)">{{neighbor(1)}}</button>
  </div>`,
  styles: [`.field{display:flex;flex-direction:column;align-items:stretch;min-width:0;text-align:center;touch-action:pan-x}.label{font-size:11px;color:var(--wkly-muted-color,#54616e);margin-bottom:4px}button,input{font:inherit;box-sizing:border-box;min-height:44px;width:100%;border:0;text-align:center;background:transparent;color:inherit;border-radius:7px}button{color:var(--wkly-muted-color,#54616e);cursor:pointer}input{font-size:18px;font-weight:650;background:var(--wkly-range-color,#e5f1ee);border-block:2px solid var(--wkly-accent-color,#176c55)}input[aria-invalid=true]{border-color:var(--wkly-error-color,#b42318)}:focus-visible{outline:2px solid var(--wkly-focus-color,#124ee0);outline-offset:1px}button:disabled,input:disabled{opacity:.45}button:hover:not(:disabled){background:var(--wkly-range-color,#e5f1ee)}`]
})
export class WklyFieldComponent implements OnDestroy {
  @Input() value: number | null = 0; @Input() label = ''; @Input() min = 0; @Input() max = 59; @Input() step = 1;
  @Input() locale = 'en-US'; @Input() disabled = false; @Input() invalid = false; @Input() labels: readonly string[] | null = null;
  @Output() valueChange = new EventEmitter<number | null>(); @Output() complete = new EventEmitter<void>();
  private before: number | null = null; private touchY = 0;
  private wheelTimer: ReturnType<typeof setTimeout> | null = null;
  get display(): string { return this.value === null ? '' : this.labels ? this.labels[this.value - this.min] || String(this.value) : new Intl.NumberFormat(this.locale, { useGrouping: false, minimumIntegerDigits: this.max < 60 ? 2 : 1 }).format(this.value); }
  next(delta: number): number { const count = Math.floor((this.max - this.min) / this.step) + 1; return this.min + floorMod(Math.floor(((this.value === null ? this.min : this.value) - this.min) / this.step) + delta, count) * this.step; }
  neighbor(delta: number): string { const n = this.next(delta); return this.labels ? this.labels[n - this.min] || '' : new Intl.NumberFormat(this.locale, { useGrouping: false }).format(n); }
  stepBy(delta: number): void { if (this.disabled) return; this.value = this.next(delta); this.valueChange.emit(this.value); this.complete.emit(); }
  begin(event: FocusEvent): void { this.before = this.value; (event.target as HTMLInputElement).select(); }
  type(event: Event): void { const input = event.target as HTMLInputElement, digits = normalizeDigits(input.value); input.value = digits; this.value = digits === '' ? null : Number(digits); this.valueChange.emit(this.value); }
  key(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.value = this.before; this.valueChange.emit(this.before); (event.target as HTMLInputElement).value = this.display; (event.target as HTMLInputElement).blur(); }
    if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); this.complete.emit(); }
    const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : event.key === 'PageUp' ? -5 : event.key === 'PageDown' ? 5 : 0;
    if (delta) { event.preventDefault(); this.stepBy(delta); }
  }
  wheel(event: WheelEvent): void { if (this.disabled || Math.abs(event.deltaY) < 1) return; event.preventDefault(); this.value = this.next(event.deltaY > 0 ? 1 : -1); this.valueChange.emit(this.value); if (this.wheelTimer !== null) clearTimeout(this.wheelTimer); this.wheelTimer = setTimeout(() => { this.wheelTimer = null; this.complete.emit(); }, 140); }
  ngOnDestroy(): void { if (this.wheelTimer !== null) clearTimeout(this.wheelTimer); }
  touchStart(event: TouchEvent): void { this.touchY = event.touches[0].clientY; }
  touchEnd(event: TouchEvent): void { const delta = this.touchY - event.changedTouches[0].clientY; if (Math.abs(delta) > 16) this.stepBy(Math.round(delta / 40) || Math.sign(delta)); }
}
