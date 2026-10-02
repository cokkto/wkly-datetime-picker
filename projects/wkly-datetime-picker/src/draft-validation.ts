import { orderedRange } from "wkly-datetime-picker.core";
import {
  encodeIso,
  error,
  validateSelection,
  WklyCalendarAdapter,
  WklyCalendarDate,
  WklyPickerValue,
  WklySelectionConfig,
  WklySelectionMode,
  WklyValidationError,
  WklyValidationException,
} from "wkly-datetime-picker.adapters";

/** Manual fields stay editable even when their calendar date is impossible. */
export interface WklyDraft {
  date: WklyCalendarDate;
  hour: number | null;
  minute: number | null;
  second: number | null;
  present: boolean;
}

export interface WklyDraftValidationOptions {
  drafts: readonly WklyDraft[];
  configErrors: readonly WklyValidationError[];
  adapter: WklyCalendarAdapter;
  selection: WklySelectionConfig;
  mode: WklySelectionMode;
  isRange: boolean;
  hasDate: boolean;
  hasTime: boolean;
  showSeconds: boolean;
  required: boolean;
}

export interface WklyDraftValidationResult {
  errors: readonly WklyValidationError[];
  pendingValue: WklyPickerValue;
}

/** Convert complete drafts to wire values, then apply selection constraints. */
export function validateDrafts(
  options: WklyDraftValidationOptions,
): WklyDraftValidationResult {
  const {
    drafts,
    configErrors,
    adapter,
    selection,
    mode,
    isRange,
    hasDate,
    hasTime,
    showSeconds,
    required,
  } = options;
  const errors: WklyValidationError[] = configErrors.slice();
  const values: string[] = [];
  drafts.slice(0, isRange ? 2 : 1).forEach((draft, index) => {
    const endpoint = isRange ? (index === 0 ? "start" : "end") : "single";
    if (!draft.present) {
      if (
        (required || drafts.some((item) => item.present)) &&
        !errors.some((item) => item.code === "incomplete")
      )
        errors.push(error("incomplete", draft, undefined, endpoint));
      return;
    }
    if (hasDate)
      for (const entry of adapter.validateDate(draft.date))
        errors.push(
          error(entry.code as any, draft.date, entry.field, endpoint),
        );
    if (
      hasDate &&
      [draft.date.day, draft.date.month, draft.date.year].some(
        (value) => value === null || Number.isNaN(value),
      )
    )
      errors.push(error("incomplete", draft.date, "date", endpoint));
    if (
      hasTime &&
      [draft.hour, draft.minute, showSeconds ? draft.second : 0].some(
        (value) => value === null,
      )
    )
      errors.push(error("incomplete", draft, "time", endpoint));
    if (!errors.length)
      try {
        values.push(
          encodeIso(
            {
              // The canonical time-only wire date is 0000-01-01.
              epochDay: hasDate ? adapter.dateToEpochDay(draft.date) : -719528,
              hour: draft.hour!,
              minute: draft.minute!,
              second: draft.second!,
            },
            mode,
            showSeconds,
          ),
        );
      } catch (caught) {
        errors.push(
          ...(caught instanceof WklyValidationException
            ? caught.errors
            : [error("invalid-calendar-date", draft)]),
        );
      }
  });
  let value: WklyPickerValue = null;
  if (values.length === (isRange ? 2 : 1))
    value = isRange
      ? orderedRange(values[0], values[1], (a, b) => a.localeCompare(b))
      : values[0];
  if (value !== null || !errors.some((item) => item.code === "incomplete"))
    errors.push(...validateSelection(value, selection, adapter));
  return { errors, pendingValue: errors.length ? null : value };
}
