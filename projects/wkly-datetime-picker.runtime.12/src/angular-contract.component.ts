import { Component } from "@angular/core";
import {
  WKLY_CONFIG,
  WKLY_LOCALIZATION,
  WKLY_TRANSLATIONS,
} from "wkly-datetime-picker.12";
import { AngularContractController } from "../../wkly-datetime-picker.runtime/src/angular-contract-controller";

@Component({
  selector: "wkly-angular-contract",
  templateUrl:
    "../../wkly-datetime-picker.runtime/src/angular-contract.component.html",
  providers: [
    {
      provide: WKLY_CONFIG,
      useFactory: () =>
        new URLSearchParams(window.location.search).get("defaults") === "locale"
          ? {}
          : { locale: "en-US", weekOffset: 3, initialEpochDay: -20 },
    },
    { provide: WKLY_LOCALIZATION, useValue: { confirm: "Local confirm" } },
    {
      provide: WKLY_TRANSLATIONS,
      useValue: {
        "en-US": { now: "Injected regional now" },
        en: { next: "Injected next" },
      },
    },
  ],
})
export class AngularContractComponent extends AngularContractController {}
