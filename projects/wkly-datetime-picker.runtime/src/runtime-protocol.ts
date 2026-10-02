/** Plain data crossing the iframe boundary between the host and each Angular runtime. */
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

/** Accept messages only from the expected window on the current origin. */
export function isExpectedRuntimeMessage(
  event: MessageEvent,
  source: Window | null | undefined,
  origin: string,
): event is MessageEvent & { data: RuntimeMessage } {
  return (
    !!source &&
    event.source === source &&
    event.origin === origin &&
    isRuntimeMessage(event.data)
  );
}

/** Validate the fields used immediately by both runtime versions. */
export function isRuntimeConfig(value: unknown): value is RuntimeConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as RuntimeConfig;
  return typeof config.locale === "string" && typeof config.mode === "string";
}
