import { Component } from "@angular/core";
import { PAGES } from "../../wkly-datetime-picker.showcase/src/pages";
import { DemoConfig } from "../../wkly-datetime-picker.showcase/src/demo.component";

export const LAYOUTS = ["empty", "contained", "form", "booking"];
declare const WKLY_ANGULAR: string;

@Component({
  selector: "wkly-testbed",
  standalone: false,
  templateUrl: "./testbed.component.html",
})
export class TestbedComponent {
  readonly version = WKLY_ANGULAR;
  readonly layouts = LAYOUTS;
  readonly demos = Object.keys(PAGES).reduce<DemoConfig[]>(
    (all, key) => all.concat(PAGES[key].demos),
    [],
  );
  readonly segments = window.location.pathname.split("/").filter(Boolean);
  readonly layout = this.segments[1] || "empty";
  readonly demo =
    this.segments[0] === "cases" && LAYOUTS.includes(this.layout)
      ? this.demos.find((demo) => demo.id === this.segments[2])
      : undefined;
  readonly catalogue = window.location.pathname === "/";
  readonly contracts = window.location.pathname === "/contracts";
}
