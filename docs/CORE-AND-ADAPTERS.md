# Core coordinates and calendar adapters

## Boundary and source

`projects/wkly-datetime-picker.core/src/public-api.ts` contains safe-integer epoch-day and absolute-week arithmetic, immutable seven-day week models, a bounded LRU week cache, range ordering, and viewport state. It has no calendar, `Date`, `Intl`, locale, clock, or Angular dependency.

`projects/wkly-datetime-picker.adapters/src/public-api.ts` maps epoch days to calendar dates, provides the `WklyCalendarAdapter` extension contract and Gregorian implementation, resolves locale week starts, formats labels, handles UTC wire values, and validates selection constraints. The showcase [Hebrew](../projects/wkly-datetime-picker.showcase/src/hebrew-adapter.ts) and [Hijri](../projects/wkly-datetime-picker.showcase/src/hijri-adapter.ts) adapters are source-only extension examples. [API reference](API.md) lists exported types and operations.

## Invariants

An `epochDay` is a civil-day index with `1970-01-01 = 0`. A week offset is `0..6`, where 0 begins on Thursday and 4 begins on Monday:

```text
absoluteWeek = floor((epochDay - weekOffset) / 7)
firstEpochDay = absoluteWeek * 7 + weekOffset
```

Use mathematical floor division for negative days. A week model contains exactly seven consecutive epoch days and is frozen. Month and year labels are derived from the visible dates; months do not own weeks. Direct jumps compute a coordinate instead of walking calendar months. The default generator cache holds at most 256 weeks.

Every public value is a Gregorian UTC ISO string. Date mode uses midnight; time mode uses the fixed `0000-01-01` wire date. A range is an ordered immutable pair, and an empty value is `null`. `decodeIso` rejects offsets, invalid dates, and noncanonical precision; `encodeIso` normalizes hidden fields. Display-calendar conversion must round-trip epoch days and respect the adapter's supported range. Adapters must keep month codes stable and preserve impossible manual drafts until validation reports them.

## Checks

The [Hijri source adapter](../projects/wkly-datetime-picker.showcase/src/hijri-adapter.ts) implements `islamic-civil` with no additional package dependency. Its Friday epoch is Gregorian 622-07-19; months alternate 30/29 days and the final month gains a day in years 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, and 29 of each 30-year cycle. Integer arithmetic performs conversion; `Intl` with an explicit calendar and UTC timezone formats month labels. This is the tabular civil calendar, distinct from observational Hijri and Umm al-Qura. Both Hebrew and Hijri examples are Git source only, excluded from npm artifacts, and support Gregorian 1900-01-01 through 2100-12-31 inclusive. Their advertised year bounds include partial boundary years: Hebrew 5660–5861 and Hijri 1317–1524; epoch-day bounds remain authoritative.

[example-calendars.spec.ts](../projects/wkly-datetime-picker.tests/contracts/example-calendars.spec.ts) checks exact conversion pairs, bounds/errors, month identities, leap years, draft-preserving arithmetic and UTC values in both host timezones. Hijri's entire advertised interval is checked against independent `Intl` civil-calendar fields and round trips. The exhaustive Hebrew round-trip contract is in [core-adapters.spec.ts](../projects/wkly-datetime-picker.tests/contracts/core-adapters.spec.ts).

```sh
npm run test:contracts
npm run test:packages:shared
npm run build
```

Source contracts live in `projects/wkly-datetime-picker.tests/contracts/*.spec.ts`; the [test coverage index](TEST-DOMAINS.md#source-and-installed-shared-package-contracts) links each suite. The installed check packs the three shared packages and runs those contracts against the tarballs in an isolated consumer. Use [the developer guide](README.DEV.md) for broader checks.
