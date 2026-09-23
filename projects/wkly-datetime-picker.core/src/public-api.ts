/** Calendar-neutral integer day and week coordinates. */
export type EpochDay = number;
export type AbsoluteWeek = number;
export type WklyWeekOffset = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export function integer(value: number): number {
  if (!Number.isSafeInteger(value))
    throw new RangeError("Expected a finite safe integer");
  return value;
}
function offset(value: WklyWeekOffset): number {
  integer(value);
  if (value < 0 || value > 6) throw new RangeError("Week offset must be 0..6");
  return value;
}
export function floorDiv(dividend: number, divisor: number): number {
  integer(dividend);
  integer(divisor);
  if (divisor <= 0) throw new RangeError("Divisor must be positive");
  return integer(Math.floor(dividend / divisor));
}
export function floorMod(dividend: number, divisor: number): number {
  floorDiv(dividend, divisor);
  const remainder = dividend % divisor;
  return remainder < 0 ? remainder + divisor : remainder === 0 ? 0 : remainder;
}
export function absoluteWeekOf(
  epochDay: EpochDay,
  weekOffset: WklyWeekOffset,
): AbsoluteWeek {
  return floorDiv(integer(integer(epochDay) - offset(weekOffset)), 7);
}
export function firstEpochDayOf(
  absoluteWeek: AbsoluteWeek,
  weekOffset: WklyWeekOffset,
): EpochDay {
  return integer(integer(integer(absoluteWeek) * 7) + offset(weekOffset));
}
export interface WklyWeek {
  readonly absoluteWeek: AbsoluteWeek;
  readonly weekOffset: WklyWeekOffset;
  readonly epochDays: readonly [
    EpochDay,
    EpochDay,
    EpochDay,
    EpochDay,
    EpochDay,
    EpochDay,
    EpochDay,
  ];
}
export function generateWeek(
  absoluteWeek: AbsoluteWeek,
  weekOffset: WklyWeekOffset,
): WklyWeek {
  const start = firstEpochDayOf(absoluteWeek, weekOffset);
  const days = Array.from({ length: 7 }, (_, i) => integer(start + i));
  return Object.freeze({
    absoluteWeek,
    weekOffset,
    epochDays: Object.freeze(days) as unknown as WklyWeek["epochDays"],
  });
}
export interface WklyWeekGeneratorOptions {
  readonly weekOffset?: WklyWeekOffset;
  readonly cacheSize?: number;
}
export interface WklyWeekGenerator {
  readonly weekOffset: WklyWeekOffset;
  readonly cacheSize: number;
  getWeek(absoluteWeek: AbsoluteWeek): WklyWeek;
  clearCache(): void;
}
export function createWeekGenerator(
  options: WklyWeekGeneratorOptions = {},
): WklyWeekGenerator {
  const weekOffset = options.weekOffset === undefined ? 0 : options.weekOffset;
  offset(weekOffset);
  const cacheSize = integer(
    options.cacheSize === undefined ? 256 : options.cacheSize,
  );
  if (cacheSize < 0) throw new RangeError("Negative cache size");
  const cache = new Map<number, WklyWeek>();
  return Object.freeze({
    weekOffset,
    cacheSize,
    getWeek(week: number) {
      integer(week);
      const model = cache.get(week) || generateWeek(week, weekOffset);
      if (cacheSize) {
        cache.delete(week);
        cache.set(week, model);
        if (cache.size > cacheSize) cache.delete(cache.keys().next().value);
      }
      return model;
    },
    clearCache() {
      cache.clear();
    },
  });
}
export interface WklyViewportState {
  readonly anchorAbsoluteWeek: AbsoluteWeek;
  readonly firstAbsoluteWeek: AbsoluteWeek;
  readonly lastAbsoluteWeek: AbsoluteWeek;
  readonly focusedEpochDay: EpochDay | null;
  readonly activeEndpoint: "start" | "end" | null;
  readonly viewMode: "calendar" | "manual";
}
export function orderedRange<T>(
  start: T,
  end: T,
  compare: (a: T, b: T) => number,
): readonly [T, T] {
  return Object.freeze(
    compare(start, end) <= 0 ? [start, end] : [end, start],
  ) as readonly [T, T];
}
