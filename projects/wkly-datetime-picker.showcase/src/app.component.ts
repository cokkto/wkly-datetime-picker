import { Component } from "@angular/core";
import { RuntimeVersionService } from "./runtime-version.service";
import { PAGES } from "./pages";

@Component({
  selector: "wkly-showcase",
  standalone: false,
  templateUrl: "./app.component.html",
})
export class AppComponent {
  constructor(public versions: RuntimeVersionService) {}
  selectVersion(event: Event): void {
    this.versions.select((event.target as HTMLSelectElement).value);
  }
  menu = false;
  routes = Object.keys(PAGES);
  labels: Record<string, string> = {
    single: "Single selections",
    ranges: "Ranges",
    presentations: "Presentations",
    localization: "Localization",
    calendars: "Calendar adapters",
    validation: "Validation & forms",
    virtualization: "Virtual scrolling",
    styling: "Colors & sizing",
  };
}
