/** Plain data shared by the evergreen host and each isolated Angular runtime. */
export type WireValue = string | readonly string[] | null;

export interface RuntimeConfig {
  mode: string;
  value: WireValue;
  locale: string;
  calendar: "gregorian" | "hebrew";
  presentation: "inline" | "dialog" | "overlay" | "material";
  weekOffset: number | null;
  weekLabelMode: "locale" | "hidden";
  viewportPreset: { kind: string; [key: string]: string | number };
  initialEpochDay: number | null;
  hourCycle: string;
  showSeconds: boolean;
  minuteStep: number;
  min: string | null;
  max: string | null;
  required: boolean;
  disabled: boolean;
  allowRangeAcrossDisabled: boolean;
  validation: boolean;
  translations: Readonly<Record<string, Readonly<Record<string, string>>>>;
  color: string;
  size: number;
  dark: boolean;
}

export interface RuntimeMessage {
  type: string;
  payload?: unknown;
}

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as RuntimeMessage).type === "string"
  );
}
