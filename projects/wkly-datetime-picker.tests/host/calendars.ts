import { WklyGregorianCalendarAdapter } from "wkly-datetime-picker.adapters";
import { ShowcaseHebrewCalendarAdapter } from "../../wkly-datetime-picker.showcase/src/hebrew-adapter";
import { ShowcaseHijriCalendarAdapter } from "../../wkly-datetime-picker.showcase/src/hijri-adapter";
import type { FixtureSpec } from "./protocol";
export function calendarAdapter(
  calendar: FixtureSpec["calendar"],
  locale: string,
) {
  return calendar === "hebrew"
    ? new ShowcaseHebrewCalendarAdapter(locale)
    : calendar === "hijri"
      ? new ShowcaseHijriCalendarAdapter(locale)
      : new WklyGregorianCalendarAdapter(locale);
}
