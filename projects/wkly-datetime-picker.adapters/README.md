# @wkly/adapters

Calendar conversion, localized labels, canonical UTC values, and selection validation for WKLY. Use this Angular-independent package when building calendar interfaces or implementing a custom display calendar.

Showcase: [https://cokkto.github.io/wkly-datetime-picker](https://cokkto.github.io/wkly-datetime-picker)

## Install

```sh
npm install @wkly/adapters
```

Depends on `@wkly/core` and provides CommonJS, ES modules, and TypeScript declarations. Node.js usage requires Node 16 or later.

## Convert and validate a value

```ts
import {
  WklyGregorianCalendarAdapter,
  decodeIso,
  encodeIso,
  validateSelection,
} from '@wkly/adapters';

const adapter = new WklyGregorianCalendarAdapter('en-US');
const value = '2026-10-06T00:00:00.000Z';
const decoded = decodeIso(value);
const date = adapter.epochDayToDate(decoded.epochDay);

console.log(adapter.formatDate(date));
console.log(encodeIso(decoded, 'date')); // Same canonical UTC value
console.log(validateSelection(value, { mode: 'date', required: true }, adapter));
// [] means valid
```

## Functionality

- `WklyGregorianCalendarAdapter` converts epoch days and Gregorian dates for years `0000..9999`, formats localized display/accessibility labels, and supplies month lengths and week labels.
- `WklyCalendarAdapter` defines custom calendars; `WklyCalendarAbstractAdapter` supplies reusable locale formatters.
- `resolveWeekOffset` resolves explicit, application, and locale week starts; `normalizeDigits` converts supported localized decimal digits to ASCII.
- `decodeIso` and `encodeIso` handle canonical Gregorian UTC timestamps with `.000Z` precision. Date mode uses midnight; time mode uses the fixed wire date `0000-01-01`.
- `validateSelection` checks value shape, required values, bounds, disabled dates/times, minute/second steps, ranges across disabled values, adapter bounds, and custom validators. Values are a single string, a pair of strings, or `null`.
- Selection, predicate, range, and validation types let custom hosts share the picker's value contract.

Display calendars map back to Gregorian UTC wire values. Custom adapters must round-trip epoch days, preserve stable month codes, and retain impossible manual drafts so validation can report them. Hebrew and civil Hijri adapters are [source examples](https://github.com/cokkto/wkly-datetime-picker/tree/main/projects/wkly-datetime-picker.showcase/src), excluded from npm artifacts.

For the Angular UI, install [@wkly/datetime-picker](https://www.npmjs.com/package/@wkly/datetime-picker) with the major matching your Angular version.

See the [API reference](https://github.com/cokkto/wkly-datetime-picker/blob/main/docs/API.md). [MIT license](LICENSE).
