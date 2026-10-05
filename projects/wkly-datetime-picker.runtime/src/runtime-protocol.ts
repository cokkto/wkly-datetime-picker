/** Shared picker configuration and local Angular output events. */
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
  calendar: "gregorian" | "hebrew" | "hijri";
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
