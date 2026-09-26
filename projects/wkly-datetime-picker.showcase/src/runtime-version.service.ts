import { EventEmitter, Injectable } from "@angular/core";

declare const WKLY_RUNTIME_VERSIONS: readonly string[];
declare const WKLY_INITIAL_ANGULAR: string;

@Injectable({ providedIn: "root" })
export class RuntimeVersionService {
  readonly available = [...WKLY_RUNTIME_VERSIONS].sort(
    (a, b) => Number(b) - Number(a),
  );
  readonly changed = new EventEmitter<string>();
  selected = this.available.includes(WKLY_INITIAL_ANGULAR)
    ? WKLY_INITIAL_ANGULAR
    : this.available[0];

  select(major: string): void {
    if (!this.available.includes(major) || major === this.selected) return;
    this.selected = major;
    this.changed.emit(major);
  }
}
