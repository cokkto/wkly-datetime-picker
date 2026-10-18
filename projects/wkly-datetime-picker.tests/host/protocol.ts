import type {
  WklyJumpOptions,
  WklyPickerInputs,
  WklyConfiguration,
  WklyStrings,
  WklyTranslations,
} from "wkly-datetime-picker";
import type {
  WklyCalendarDate,
  WklyPickerValue,
  WklyValidationError,
} from "wkly-datetime-picker.adapters";
export type PublicInputs = Partial<
  Omit<
    WklyPickerInputs,
    | "calendarAdapter"
    | "isDateDisabled"
    | "isTimeDisabled"
    | "rangeValidator"
    | "weekLabelFormatter"
    | "validators"
  >
>;
export interface FixtureSpec {
  calendar?: "gregorian" | "hebrew" | "hijri";
  pairedCalendars?: boolean;
  config?: WklyConfiguration;
  localization?: WklyStrings;
  translations?: WklyTranslations;
  presentation?: "inline" | "native" | "cdk" | "material";
  inputs?: PublicInputs;
  value?: WklyPickerValue;
  binding?: "form" | "input";
  reflectValue?: boolean;
  clock?: string;
  disabledEpochDays?: number[];
}
export interface HostEvent {
  fixtureId: number;
  name: string;
  value: unknown;
}
export interface HostSnapshot {
  value: WklyPickerValue;
  errors: { wkly: readonly WklyValidationError[] } | null;
  formErrors: { wkly?: readonly WklyValidationError[] } | null;
  status: string;
  touched: boolean;
  dirty: boolean;
  disabled: boolean;
  events: HostEvent[];
}
export interface HostIdentity {
  angular: string;
  bootId: string;
  fixtureId: number;
  mounts: number;
  destroys: number;
}
export type JumpRequest = (
  | { method: "epoch" | "week"; value: number }
  | { method: "calendar"; value: WklyCalendarDate }
  | { method: "value"; value: string }
) & { options?: WklyJumpOptions; closeAfter?: boolean };
export interface HostBridge {
  calendarDate(epochDay: number): WklyCalendarDate;
  close(): Promise<HostSnapshot>;
  jump(request: JumpRequest): Promise<number[]>;
  identity(): HostIdentity;
  mount(spec: FixtureSpec): Promise<HostIdentity>;
  setInputs(inputs: PublicInputs): Promise<HostSnapshot>;
  writeValue(
    value: WklyPickerValue,
    via?: "form" | "cva",
  ): Promise<HostSnapshot>;
  setDisabled(disabled: boolean): Promise<HostSnapshot>;
  snapshot(): HostSnapshot;
  destroy(): Promise<HostIdentity>;
}
declare global {
  interface Window {
    wklyTestHost: HostBridge;
  }
}
