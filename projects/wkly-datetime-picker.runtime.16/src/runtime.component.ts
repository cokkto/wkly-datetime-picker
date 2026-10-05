import { Component } from "@angular/core";
import { RuntimeController } from "../../wkly-datetime-picker.runtime/src/runtime-controller";
@Component({
  selector: "wkly-runtime",
  standalone: false,
  templateUrl: "../../wkly-datetime-picker.runtime/src/runtime.component.html",
})
export class RuntimeComponent extends RuntimeController {}
