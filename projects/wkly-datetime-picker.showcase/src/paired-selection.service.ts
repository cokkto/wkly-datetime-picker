import { EventEmitter, Injectable } from "@angular/core";
import { WklyPickerValue } from "wkly-datetime-picker.adapters";

@Injectable({ providedIn: "root" })
export class PairedSelectionService {
  readonly changed = new EventEmitter<WklyPickerValue>();
  select(value: WklyPickerValue): void {
    this.changed.emit(value);
  }
}
