import { Component } from "@angular/core";
import { PAGES } from "./pages";

@Component({
  selector: "wkly-showcase",
  standalone: false,
  templateUrl: "./app.component.html",
})
export class AppComponent {
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
