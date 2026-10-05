import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Compiler,
  Component,
  ComponentRef,
  Injector,
  NgModule,
  NgModuleRef,
  NgZone,
  VERSION,
  ViewChild,
  ViewContainerRef,
} from "@angular/core";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { BrowserModule } from "@angular/platform-browser";
import { registerLocaleData } from "@angular/common";
import enGB from "@angular/common/locales/en-GB";
import he from "@angular/common/locales/he";
import fi from "@angular/common/locales/fi";
import ar from "@angular/common/locales/ar";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { WklyDateTimePickerOverlayModule } from "wkly-overlay-under-test";
import {
  WKLY_CLOCK,
  WKLY_CONFIG,
  WKLY_LOCALIZATION,
  WKLY_TRANSLATIONS,
} from "wkly-picker-under-test";
import { createFixture, hostProviders } from "wkly-host-lifecycle";
import { TransientFixture, TransientFixtureModule } from "./transient";
import { PairedFixture, PairedFixtureModule } from "./paired";
import { calendarAdapter } from "./calendars";
import { FixtureController } from "./fixture";
import { Fixture, FixtureModule } from "./inline";
import type { HostIdentity } from "./protocol";
import "./styles.css";
[enGB, ar, he, fi].forEach((locale) => registerLocaleData(locale));
@Component({
  selector: "test-host",
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<button id="focus-sentinel">Outside picker</button
    ><ng-container #mountPoint></ng-container>`,
})
class TestHost implements AfterViewInit {
  @ViewChild("mountPoint", { read: ViewContainerRef, static: true })
  mountPoint!: ViewContainerRef;
  private state: HostIdentity = {
    angular: VERSION.major,
    bootId: `${Date.now()}-${Math.random()}`,
    fixtureId: 0,
    mounts: 0,
    destroys: 0,
  };
  constructor(
    private zone: NgZone,
    private compiler: Compiler,
    private injector: Injector,
  ) {}
  ngAfterViewInit(): void {
    const factories = {
      paired: this.compiler.compileModuleAsync(PairedFixtureModule),
      inline: this.compiler.compileModuleAsync(FixtureModule),
      transient: this.compiler.compileModuleAsync(TransientFixtureModule),
    };
    let ref: ComponentRef<FixtureController> | undefined;
    let module: NgModuleRef<unknown> | undefined;
    let scoped: (Injector & { destroy?: () => void }) | undefined;
    let busy = false;
    const settle = () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    const identity = () => ({ ...this.state });
    const fixture = () => {
      if (!ref) throw new Error("No mounted fixture");
      return ref.instance;
    };
    const update = async (action: () => void) => {
      if (busy) throw new Error("Overlapping host operations");
      busy = true;
      try {
        this.zone.run(() => {
          action();
          ref!.changeDetectorRef.detectChanges();
        });
        await settle();
        return fixture().snapshot();
      } finally {
        busy = false;
      }
    };
    const destroy = async () => {
      if (busy) throw new Error("Overlapping host operations");
      busy = true;
      try {
        this.zone.run(() => {
          if (ref) {
            this.mountPoint.clear();
            ref = undefined;
            this.state.destroys++;
          }
          module?.destroy();
          module = undefined;
          scoped?.destroy?.();
          scoped = undefined;
        });
        await settle();
        const remaining = () =>
          document.querySelector(
            "test-fixture, wkly-datetime-picker, dialog, .cdk-overlay-pane, .cdk-overlay-backdrop, .cdk-focus-trap-anchor",
          );
        // Older CDK versions remove their backdrop after a CSS transition.
        // Observe cleanup; never remove presentation resources on the picker's behalf.
        const deadline = performance.now() + 2000;
        while (remaining() && performance.now() < deadline)
          await new Promise<void>((resolve) => setTimeout(resolve, 20));
        if (remaining()) throw new Error("Fixture DOM survived destruction");
        return identity();
      } finally {
        busy = false;
      }
    };
    window.wklyTestHost = {
      identity,
      calendarDate: (day) =>
        (
          fixture().inputs.calendarAdapter ||
          calendarAdapter("gregorian", "en-GB")
        ).epochDayToDate(day),
      mount: async (spec) => {
        if (ref || busy)
          throw new Error(
            "Previous fixture still mounted or operation in progress",
          );
        busy = true;
        try {
          const transient = spec.presentation && spec.presentation !== "inline";
          if (transient && spec.binding === "input")
            throw new Error("Transient fixtures use reactive forms");
          const compiled =
            await factories[
              spec.pairedCalendars
                ? "paired"
                : transient
                  ? "transient"
                  : "inline"
            ];
          const clock = spec.clock || "2099-12-16T13:00:00.000Z";
          if (!Number.isFinite(Date.parse(clock)))
            throw new Error("Invalid fixture clock");
          this.zone.run(() => {
            scoped = Injector.create({
              parent: this.injector,
              providers: [
                { provide: WKLY_CONFIG, useValue: spec.config || {} },
                {
                  provide: WKLY_LOCALIZATION,
                  useValue: spec.localization || {},
                },
                {
                  provide: WKLY_TRANSLATIONS,
                  useValue: spec.translations || {},
                },
                {
                  provide: WKLY_CLOCK,
                  useValue: { now: () => new Date(clock) },
                },
              ],
            });
            module = compiled.create(scoped);
            ref = createFixture<FixtureController>(
              this.mountPoint,
              spec.pairedCalendars
                ? PairedFixture
                : transient
                  ? TransientFixture
                  : Fixture,
              module,
            );
            this.state.fixtureId++;
            this.state.mounts++;
            ref.instance.initialize(spec, this.state.fixtureId);
            ref.changeDetectorRef.detectChanges();
          });
          await settle();
          return identity();
        } catch (error) {
          busy = false;
          await destroy();
          throw error;
        } finally {
          busy = false;
        }
      },
      jump: async (request) => {
        let tabStops: number[] = [];
        await update(() => {
          const picker = fixture().picker;
          switch (request.method) {
            case "epoch":
              picker.scrollToEpochDay(request.value, request.options);
              break;
            case "week":
              picker.scrollToAbsoluteWeek(request.value, request.options);
              break;
            case "calendar":
              picker.scrollToCalendarDate(request.value, request.options);
              break;
            case "value":
              picker.scrollToValue(request.value, request.options);
              break;
          }
          // Capture before the host's next change detection or deferred focus can repair it.
          tabStops = Array.from(
            document.querySelectorAll("button.day[tabindex='0']"),
            (day) => Number(day.getAttribute("data-day")),
          );
          if (request.closeAfter) fixture().close();
        });
        return tabStops;
      },
      close: () => update(() => fixture().close()),
      setInputs: (inputs) => update(() => fixture().patch(inputs)),
      writeValue: (value, via = "form") =>
        update(() => {
          if (via === "form") fixture().form.setValue(value);
          else fixture().picker.writeValue(value);
        }),
      setDisabled: (disabled) =>
        update(() => {
          if (disabled) fixture().form.disable();
          else fixture().form.enable();
        }),
      snapshot: () => fixture().snapshot(),
      destroy,
    };
  }
}
@NgModule({
  declarations: [TestHost],
  providers: hostProviders,
  imports: [
    BrowserModule,
    NoopAnimationsModule,
    WklyDateTimePickerOverlayModule,
  ],
  bootstrap: [TestHost],
})
class TestHostModule {}
platformBrowserDynamic()
  .bootstrapModule(TestHostModule)
  .catch((error) => console.error(error));
