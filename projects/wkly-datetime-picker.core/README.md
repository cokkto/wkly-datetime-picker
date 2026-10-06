# @wkly/core

Calendar-neutral day and week arithmetic for WKLY. Use this Angular-independent package to build continuous calendars, generate immutable weeks, or navigate directly to a day without walking through months.

Showcase: [https://cokkto.github.io/wkly-datetime-picker](https://cokkto.github.io/wkly-datetime-picker)

## Install

```sh
npm install @wkly/core
```

Provides CommonJS, ES modules, and TypeScript declarations. There are no runtime dependencies. Node.js usage requires Node 16 or later.

## Generate a week

```ts
import { absoluteWeekOf, createWeekGenerator } from '@wkly/core';

const generator = createWeekGenerator({ weekOffset: 4 }); // Monday
const week = generator.getWeek(absoluteWeekOf(0, generator.weekOffset));
console.log(week.epochDays); // [-3, -2, -1, 0, 1, 2, 3]
```

An epoch day is an integer civil-day coordinate: `1970-01-01` is `0`. A week offset is `0..6`, with `0` beginning on Thursday and `4` on Monday. Weeks contain exactly seven consecutive days; the model and day tuple are frozen. Negative epoch days use mathematical floor division.

## Functionality

- `absoluteWeekOf` and `firstEpochDayOf` convert day and week coordinates.
- `generateWeek` creates an immutable week; `createWeekGenerator` adds a bounded LRU cache, defaulting to 256 weeks. Set `cacheSize: 0` to disable caching.
- `integer`, `floorDiv`, and `floorMod` enforce safe-integer arithmetic.
- `orderedRange` returns a frozen pair sorted with your comparator.
- `WklyViewportState` describes viewport coordinates, focus, the active range endpoint, and view mode.

Looking for a complete date, time, or range picker? The Angular [@wkly/datetime-picker](https://www.npmjs.com/package/@wkly/datetime-picker) package includes date-range and time-range selection.

Use [@wkly/adapters](https://www.npmjs.com/package/@wkly/adapters) for calendar conversion, locale formatting, and selection validation; [@wkly/presentation](https://www.npmjs.com/package/@wkly/presentation) for shared rendering helpers; or [@wkly/datetime-picker](https://www.npmjs.com/package/@wkly/datetime-picker) for the Angular UI.

See the [API reference](https://github.com/cokkto/wkly-datetime-picker/blob/main/docs/API.md). [MIT license](LICENSE).
