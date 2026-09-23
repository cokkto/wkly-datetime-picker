import { ComponentFactoryResolver, Directive, ElementRef, forwardRef, Injectable, Injector, NgModule } from '@angular/core';
import { NG_VALIDATORS, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { FocusTrapFactory } from '@angular/cdk/a11y';
import { WklyDateTimePickerComponent, WklyDateTimePickerModule, WklyCloseReason, WklyPresentationRef, WklyTriggerBase } from 'wkly-datetime-picker';
@Injectable({ providedIn: 'root' })
export class WklyDateTimePickerOverlayService {
  constructor(private overlay: Overlay, private injector: Injector, private traps: FocusTrapFactory) {}
  open(trigger: HTMLElement, onCancel: (reason: WklyCloseReason) => void, backdrop = true): WklyPresentationRef {
    const overlay = this.overlay.create({ width: '390px', maxWidth: '100vw', maxHeight: '94vh', hasBackdrop: true, backdropClass: 'cdk-overlay-transparent-backdrop', scrollStrategy: this.overlay.scrollStrategies.block(), positionStrategy: this.overlay.position().flexibleConnectedTo(trigger).withPush(true).withFlexibleDimensions(false).withLockedPosition(true).withPositions([{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 }, { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 }]) });
    const component = overlay.attach(new ComponentPortal(WklyDateTimePickerComponent, null, this.injector)); component.instance.presentation = 'transient';
    overlay.overlayElement.setAttribute('role', 'dialog'); overlay.overlayElement.setAttribute('aria-modal', 'true'); overlay.overlayElement.setAttribute('aria-label', 'Date and time picker'); overlay.overlayElement.style.overflow = 'auto';
    const trap = this.traps.create(overlay.overlayElement);
    const sub = overlay.backdropClick().subscribe(() => { if (backdrop) onCancel('backdrop'); });
    const key = overlay.keydownEvents().subscribe(event => { if (event.key === 'Escape') { event.preventDefault(); onCancel('escape'); } });
    return { component, destroy: () => { sub.unsubscribe(); key.unsubscribe(); trap.destroy(); overlay.dispose(); trigger.focus(); } };
  }
}
@Directive({ selector: '[wklyDateTimePickerOverlay]', exportAs: 'wklyOverlay', providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => WklyDateTimePickerOverlayDirective), multi: true }, { provide: NG_VALIDATORS, useExisting: forwardRef(() => WklyDateTimePickerOverlayDirective), multi: true }] })
export class WklyDateTimePickerOverlayDirective extends WklyTriggerBase {
  constructor(element: ElementRef<HTMLElement>, private service: WklyDateTimePickerOverlayService) { super(element); }
  protected create(): WklyPresentationRef { return this.service.open(this.element.nativeElement, reason => this.close(reason), this.closeOnBackdrop); }
}
@NgModule({ imports: [OverlayModule, WklyDateTimePickerModule], declarations: [WklyDateTimePickerOverlayDirective], exports: [WklyDateTimePickerOverlayDirective] })
export class WklyDateTimePickerOverlayModule {}

