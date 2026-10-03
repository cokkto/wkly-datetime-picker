# Core coordinates and calendar adapters

## Boundary and source

`projects/wkly-datetime-picker.core/src/public-api.ts` contains safe-integer epoch-day and absolute-week arithmetic, immutable seven-day week models, a bounded LRU week cache, range ordering, and viewport state. It has no calendar, `Date`, `Intl`, locale, clock, or Angular dependency.

`projects/wkly-datetime-picker.adapters/src/public-api.ts` maps epoch days to calendar dates, provides the `WklyCalendarAdapter` extension contract and Gregorian implementation, resolves locale week starts, formats labels, handles UTC wire values, and validates selection constraints. The [showcase Hebrew adapter](../projects/wkly-datetime-picker.showcase/src/hebrew-adapter.ts) is an extension example, not a published library adapter. [API reference](API.md) lists exported types and operations.

## Invariants

An `epochDay` is a civil-day index with `1970-01-01 = 0`. A week offset is `0..6`, where 0 begins on Thursday and 4 begins on Monday:

```text
absoluteWeek = floor((epochDay - weekOffset) / 7)
firstEpochDay = absoluteWeek * 7 + weekOffset
```

Use mathematical floor division for negative days. A week model contains exactly seven consecutive epoch days and is frozen. Month and year labels are derived from the visible dates; months do not own weeks. Direct jumps compute a coordinate instead of walking calendar months. The default generator cache holds at most 256 weeks.

Every public value is a Gregorian UTC ISO string. Date mode uses midnight; time mode uses the fixed `0000-01-01` wire date. A range is an ordered immutable pair, and an empty value is `null`. `decodeIso` rejects offsets, invalid dates, and noncanonical precision; `encodeIso` normalizes hidden fields. Display-calendar conversion must round-trip epoch days and respect the adapter's supported range. Adapters must keep month codes stable and preserve impossible manual drafts until validation reports them.

## Checks

```sh
npm test
npm run test:installed
npm run build
```

Source contracts live in `projects/wkly-datetime-picker.tests/contracts.ts` and `contracts/`. The installed check packs the three shared packages and runs the domain contracts against those tarballs in an isolated consumer. Use [the developer guide](README.DEV.md) for broader checks and [the development plan](DEVELOPMENT-PLAN.md) for open contract coverage.
