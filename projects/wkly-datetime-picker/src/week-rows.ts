import { WklyWeek, WklyWeekGenerator } from "wkly-datetime-picker.core";
import {
  WklyCalendarAdapter,
  WklyCalendarDate,
  WklyWeekLabelFormatter,
  WklyWeekLabelMode,
} from "wkly-datetime-picker.adapters";

export interface WklyDayCell {
  epochDay: number;
  date: WklyCalendarDate | null;
  label: string;
  accessible: string;
  annotation: string;
  hidden: boolean;
  disabled: boolean;
}

export interface WklyWeekRow {
  week: WklyWeek;
  label: string;
  cells: WklyDayCell[];
}

export interface WklyWeekRowsOptions {
  generator: WklyWeekGenerator;
  adapter: WklyCalendarAdapter;
  startWeek: number;
  count: number;
  firstVisibleWeek: number;
  firstSupportedDay: number;
  lastSupportedDay: number;
  clipMonth: boolean;
  initialMonth: string;
  weekLabelMode: WklyWeekLabelMode;
  weekLabelFormatter: WklyWeekLabelFormatter | null;
  isDayDisabled: (day: number) => boolean;
}

/** Build only the visible weeks and overscan, leaving scroll state to Angular. */
export function createWeekRows(options: WklyWeekRowsOptions): WklyWeekRow[] {
  const {
    generator,
    adapter,
    startWeek,
    count,
    firstVisibleWeek,
    firstSupportedDay,
    lastSupportedDay,
    clipMonth,
    initialMonth,
    weekLabelMode,
    weekLabelFormatter,
    isDayDisabled,
  } = options;
  return Array.from({ length: count }, (_, i) => {
    const week = generator.getWeek(startWeek + i);
    const supported =
      week.epochDays[6] >= firstSupportedDay &&
      week.epochDays[0] <= lastSupportedDay;
    return {
      week,
      label: supported
        ? weekLabelFormatter
          ? weekLabelFormatter(week, adapter)
          : adapter.formatWeekLabel(week, weekLabelMode)
        : "",
      cells: week.epochDays.map((epochDay, index) => {
        let date: WklyCalendarDate | null = null;
        if (epochDay >= firstSupportedDay && epochDay <= lastSupportedDay) {
          try {
            date = adapter.epochDayToDate(epochDay);
          } catch (_) {
            // Adapters may reject individual days inside their declared bounds.
          }
        }
        const hidden =
          !date ||
          (clipMonth && date.year + "/" + date.monthCode !== initialMonth);
        return {
          epochDay,
          date,
          hidden,
          disabled: isDayDisabled(epochDay),
          label: date ? adapter.formatDay(date) : "",
          accessible: date ? adapter.formatAccessibleDate(date) : "",
          annotation:
            date &&
            !hidden &&
            (date.day === 1 ||
              (week.absoluteWeek === firstVisibleWeek && index === 0))
              ? adapter.formatMonth(date) + " " + adapter.formatYear(date)
              : "",
        };
      }),
    };
  });
}
