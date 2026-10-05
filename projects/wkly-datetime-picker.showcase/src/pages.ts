import { DemoConfig } from "./demo.component";

/** Demo definitions are data so routes and navigation share the same catalog. */
export const PAGES: Record<
  string,
  { title: string; description: string; demos: DemoConfig[] }
> = {
  single: {
    title: "One moment, your way.",
    description:
      "Select a date, a time, or both. Every completed inline selection is available immediately as a canonical UTC value.",
    demos: [
      {
        id: "datetime",
        title: "Date & time",
        description:
          "A continuous calendar, paired with a precise time selector.",
        hourCycle: "switchable",
      },
      {
        id: "date",
        title: "Just the date",
        description: "Date-only values always resolve to midnight UTC.",
        mode: "date",
      },
      {
        id: "time",
        title: "Time, down to the second",
        description:
          "12-hour entry with seconds. The wire date is always 0000-01-01.",
        mode: "time",
        seconds: true,
        hourCycle: "h12",
      },
    ],
  },
  ranges: {
    title: "Make room for a range.",
    description:
      "Choose two endpoints in one calendar. Reverse selections are ordered automatically, and incomplete ranges stay in the draft.",
    demos: [
      {
        id: "datetime-range",
        title: "Date & time range",
        description:
          "Independent start and end times, with one shared calendar.",
        mode: "datetime-range",
      },
      {
        id: "date-range",
        title: "Date range",
        description:
          "Select a start and end across any month or year boundary.",
        mode: "date-range",
      },
      {
        id: "time-range",
        title: "Time range",
        description: "Two stacked time selectors. Equal endpoints are valid.",
        mode: "time-range",
      },
    ],
  },
  presentations: {
    title: "At home in any interface.",
    description:
      "The same picker, four ways to present it. Dialogs and overlays keep edits private until you confirm.",
    demos: [
      {
        id: "inline",
        title: "Inline",
        description: "Always visible. Valid actions commit immediately.",
        presentation: "inline",
      },
      {
        id: "dialog",
        title: "Native dialog",
        description: "Confirm to save. Close or Escape to discard the draft.",
        presentation: "dialog",
      },
      {
        id: "overlay",
        title: "Anchored overlay",
        description: "An optional CDK overlay connected to a plain input.",
        presentation: "overlay",
      },
      {
        id: "material",
        title: "Material host",
        description: "Material styles the input; WKLY provides the picker.",
        presentation: "material",
      },
    ],
  },
  localization: {
    title: "Local language. Shared time.",
    description:
      "Explore calendar systems, reading direction, localized digits, and regional week starts side by side.",
    demos: [
      {
        id: "hebrew",
        title: "עברית · Hebrew",
        description:
          "Hebrew calendar, variable month lists, and right-to-left layout.",
        locale: "he-IL",
        calendar: "hebrew",
      },
      {
        id: "hijri",
        title: "الهجري · Hijri",
        description:
          "Tabular civil Hijri calendar with Arabic digits and right-to-left layout.",
        locale: "ar-EG",
        calendar: "hijri",
      },
      {
        id: "arabic",
        title: "العربية · Arabic",
        description:
          "Gregorian dates with Arabic labels, digits, and locale week start.",
        locale: "ar",
      },
      {
        id: "us",
        title: "English · United States",
        description: "Sunday-first weeks and a 12-hour clock with AM/PM.",
        locale: "en-US",
        hourCycle: "h12",
      },
    ],
  },
  calendars: {
    title: "Three calendars. One day.",
    description:
      "All three representations share the same epoch day. Select any calendar to update its companions.",
    demos: [
      {
        id: "gregorian-pair",
        title: "Gregorian",
        description:
          "Public values always use the Gregorian UTC ISO wire format.",
        mode: "date",
        value: "2024-03-25T00:00:00.000Z",
      },
      {
        id: "hijri-pair",
        title: "Hijri (civil)",
        description:
          "A source-only islamic-civil adapter sharing the same Gregorian UTC day.",
        mode: "date",
        calendar: "hijri",
        locale: "ar-EG",
        value: "2024-03-25T00:00:00.000Z",
      },
      {
        id: "hebrew-pair",
        title: "Hebrew",
        description:
          "A showcase-only adapter implementing the public calendar contract.",
        mode: "date",
        calendar: "hebrew",
        locale: "he-IL",
        value: "2024-03-25T00:00:00.000Z",
      },
    ],
  },
  validation: {
    title: "Keep the draft. Tell the truth.",
    description:
      "Impossible dates remain editable. Constraints apply equally to the calendar, typed fields, Now, and programmatic values.",
    demos: [
      {
        id: "constraints",
        title: "Constrained date & time",
        description:
          "December 2099–January 2100. Sundays and the noon hour are disabled.",
        validation: true,
      },
      {
        id: "range-constraints",
        title: "Disabled-range crossing",
        description:
          "A range cannot cross Sunday unless you explicitly allow it.",
        mode: "date-range",
        validation: true,
      },
      {
        id: "invalid-date",
        title: "An honest February 31",
        description:
          "Switch to manual entry and change January to February. Day 31 stays invalid.",
        mode: "date",
        value: "2100-01-31T00:00:00.000Z",
      },
      {
        id: "invalid-time",
        title: "Typed time & steps",
        description: "Try hour 24, or a minute outside the configured step.",
        mode: "time",
        hourCycle: "switchable",
      },
    ],
  },
  virtualization: {
    title: "Weeks without boundaries.",
    description:
      "Jump decades in one operation. The calendar only renders the visible weeks and a small overscan buffer.",
    demos: [
      {
        id: "virtual-month",
        title: "Full month",
        description:
          "Boundary-week days outside the anchor month are initially hidden.",
        preset: { kind: "full-month" },
        mode: "date",
      },
      {
        id: "virtual-around",
        title: "A little more context",
        description: "Boundary days plus one complete week on either side.",
        preset: {
          kind: "full-month-and-around",
          extraWeeksBefore: 1,
          extraWeeksAfter: 1,
        },
        mode: "date",
      },
      {
        id: "virtual-weeks",
        title: "Four weeks",
        description: "A compact, calendar-neutral viewport of four week rows.",
        preset: { kind: "weeks", visibleWeekCount: 4 },
        mode: "date",
      },
    ],
  },
  styling: {
    title: "A small, useful palette.",
    description:
      "CSS color tokens and a size multiplier fit the picker to your interface. Touch targets stay at least 44 pixels.",
    demos: [
      {
        id: "default-style",
        title: "Evergreen",
        description: "The default palette, with a clear current-day indicator.",
        mode: "date",
      },
      {
        id: "custom-style",
        title: "Indigo",
        description: "A custom accent color with a 1.15 size multiplier.",
        color: "#5146a5",
        size: 1.15,
        mode: "date",
      },
      {
        id: "dark-style",
        title: "Slate after dark",
        description:
          "Layered grays, blue selections, and warm constraint notices. Clear the range to see required validation.",
        theme: "dark",
        color: "#0e76b7",
        mode: "date-range",
        validation: true,
        value: ["1999-12-14T00:00:00.000Z", "2099-12-18T00:00:00.000Z"],
      },
      {
        id: "large-style",
        title: "More breathing room",
        description: "A 1.3 size multiplier with range selection.",
        color: "#854320",
        size: 1.3,
        mode: "date-range",
      },
    ],
  },
};
