import { strict as assert } from "node:assert";
import { test } from "./test";
import {
  absoluteWeekOf,
  createWeekGenerator,
  generateWeek,
  WklyWeekOffset,
} from "wkly-datetime-picker.core";
import {
  gregorianDay,
  WklyGregorianCalendarAdapter,
} from "wkly-datetime-picker.adapters";
import { createWeekRows } from "wkly-datetime-picker";
const adapter = new WklyGregorianCalendarAdapter();
for (let offset = 0; offset < 7; offset++)
  for (const [year, month, day] of [
    [0, 1, 1],
    [1969, 12, 31],
    [2000, 2, 29],
    [2024, 3, 1],
    [9999, 12, 31],
  ]) {
    test(`week rows offset ${offset} at ${year}-${month}-${day}`, () => {
      const epoch = gregorianDay(year, month, day),
        week = absoluteWeekOf(epoch, offset as WklyWeekOffset);
      const options = {
        generator: createWeekGenerator({
          weekOffset: offset as WklyWeekOffset,
        }),
        adapter,
        startWeek: week,
        count: 1,
        firstVisibleWeek: week,
        firstSupportedDay: adapter.supportedEpochDayRange[0],
        lastSupportedDay: adapter.supportedEpochDayRange[1],
        initialMonth: `${year}/M${String(month).padStart(2, "0")}`,
        weekLabelMode: "iso" as const,
        weekLabelFormatter: null,
        isDayDisabled: (candidate: number) => candidate === epoch,
      };
      const full = createWeekRows({ ...options, clipMonth: false })[0];
      const clipped = createWeekRows({ ...options, clipMonth: true })[0];
      assert.deepEqual(
        full.cells.map((cell) => cell.epochDay),
        generateWeek(week, offset as WklyWeekOffset).epochDays,
      );
      assert.equal(full.cells.length, 7);
      assert.equal(clipped.cells.length, 7);
      for (const cell of clipped.cells) {
        if (cell.date)
          assert.equal(
            cell.hidden,
            cell.date.month !== month || cell.date.year !== year,
          );
        else assert.equal(cell.hidden, true);
      }
      assert.equal(
        clipped.cells.find((cell) => cell.epochDay === epoch)!.disabled,
        true,
      );
      assert.equal(
        clipped.cells.find((cell) => cell.epochDay === epoch)!.hidden,
        false,
      );
    });
  }
