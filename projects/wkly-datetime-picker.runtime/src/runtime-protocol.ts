/** Plain data crossing the iframe boundary between the host and each Angular runtime. */
import { WklyWeekOffset } from "wkly-datetime-picker.core";
import {
  WklyHourCycle,
  WklyPickerValue,
  WklySelectionMode,
  WklyViewportPreset,
} from "wkly-datetime-picker.adapters";
import { WklyTranslations } from "wkly-datetime-picker";

export type WireValue = WklyPickerValue;

export interface RuntimeConfig {
  mode: WklySelectionMode;
  value: WireValue;
  locale: string;
  calendar: "gregorian" | "hebrew";
  presentation: "inline" | "dialog" | "overlay" | "material";
  weekOffset: WklyWeekOffset | null;
  weekLabelMode: "locale" | "hidden";
  viewportPreset: WklyViewportPreset;
  initialEpochDay: number | null;
  hourCycle: WklyHourCycle;
  showSeconds: boolean;
  minuteStep: number;
  min: string | null;
  max: string | null;
  required: boolean;
  disabled: boolean;
  allowRangeAcrossDisabled: boolean;
  validation: boolean;
  translations: WklyTranslations;
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
  return (
    typeof config.locale === "string" &&
    [
      "datetime",
      "date",
      "time",
      "datetime-range",
      "date-range",
      "time-range",
    ].includes(config.mode)
  );
}
