import { WklyCalendarAdapter } from "wkly-datetime-picker.adapters";
import { WklyDraft } from "./draft-validation";

/** Day offsets use calendar days, independent of endpoint times and timezones. */
export function draftDayDifference(
  drafts: readonly WklyDraft[],
  adapter: WklyCalendarAdapter,
): number | null {
  try {
    const day = (draft: WklyDraft) =>
      draft.unsupportedEpochDay === undefined
        ? adapter.dateToEpochDay(draft.date)
        : draft.unsupportedEpochDay;
    return day(drafts[1]) - day(drafts[0]);
  } catch (_) {
    return null;
  }
}

/** Change the existing end draft; all selection validation still runs on it. */
export function setDraftDayDifference(
  drafts: WklyDraft[],
  adapter: WklyCalendarAdapter,
  days: number | null,
): void {
  const end = drafts[1];
  end.present = true;
  delete end.unsupportedEpochDay;
  if (days === null || !Number.isInteger(days) || Math.abs(days) > 9999) {
    end.date = { ...end.date, day: null as any };
    return;
  }
  let target: number;
  try {
    target = adapter.dateToEpochDay(drafts[0].date) + days;
  } catch (_) {
    end.date = { ...end.date, day: null as any };
    return;
  }
  try {
    end.date = adapter.epochDayToDate(target);
  } catch (_) {
    // Adapters cannot convert unsupported days. Keep that attempted day on the
    // end draft and expose an impossible day in the calendar-date controls.
    const boundary = Math.max(
      adapter.supportedEpochDayRange[0],
      Math.min(adapter.supportedEpochDayRange[1], target),
    );
    const date = adapter.epochDayToDate(boundary);
    end.date = { ...date, day: date.day + target - boundary };
    end.unsupportedEpochDay = target;
  }
}
