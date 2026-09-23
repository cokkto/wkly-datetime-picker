# WKLY date/time picker

A reusable Angular date/time picker built around a continuous sequence of weeks, with a configurable visual test project.

```sh
npm ci --legacy-peer-deps
npm run showcase:start
```

Open **http://127.0.0.1:4200**. The private test project is `projects/wkly-datetime-picker.showcase`. It imports the libraries through public package names. The development compiler watches library source and templates; refresh after an edit to view the rebuilt library. No separate package build is needed between edits.

## Packages

| Package | Responsibility |
| --- | --- |
| `wkly-datetime-picker.core` | Safe integer coordinates, frozen week models, bounded LRU cache; no runtime dependencies |
| `wkly-datetime-picker.adapters` | Calendar extension contract, Gregorian conversion, UTC codec, formatting, constraints |
| `wkly-datetime-picker` | Angular component, forms, native dialog, localization, clock injection |
| `wkly-datetime-picker/cdk-overlay` | Optional anchored CDK presentation |
| `wkly-datetime-picker.showcase` | Private routed test project, Material examples, Hebrew adapter, Playwright tests |

The Angular library is built with Angular **11.2** and TypeScript **4.1**. It uses NgModules and classic inputs/outputs. Builds and contract tests support Node **16+**. The showcase uses a small esbuild/JIT compiler to watch the same source. Library artifacts are written to `dist/<package>`.

## UTC values

**WKLY performs no timezone conversion.** Every public value is a Gregorian UTC ISO string, including values selected through a non-Gregorian display calendar. Convert application timezones outside the library.

| Mode | Example |
| --- | --- |
| `datetime` | `2099-12-16T13:00:00.000Z` |
| `date` | `2099-12-16T00:00:00.000Z` |
| `time` | `0000-01-01T13:00:00.000Z` |
| `datetime-range` | `['2099-12-16T13:00:00.000Z', '2099-12-17T15:00:00.000Z']` |
| `date-range` | `['2099-12-16T00:00:00.000Z', '2099-12-17T00:00:00.000Z']` |
| `time-range` | `['0000-01-01T09:00:00.000Z', '0000-01-01T17:00:00.000Z']` |

Empty values are `null`. Complete ranges are immutable ordered tuples. Milliseconds must be `.000`; hidden seconds must be `00`. Offsets, leap seconds, impossible dates, and incorrectly shaped values are rejected. Gregorian UI years are `0000..9999`.

## Angular integration

Import `WklyDateTimePickerModule` from `wkly-datetime-picker`, and `ReactiveFormsModule` for forms:

```ts
appointment = new FormControl('2099-12-16T13:00:00.000Z');
```

```html
<wkly-datetime-picker [formControl]="appointment" mode="datetime"
  locale="en-GB" (validationChange)="errors = $event">
</wkly-datetime-picker>

<wkly-datetime-picker mode="date-range" [(value)]="range"></wkly-datetime-picker>

<button wklyDateTimePickerDialog mode="datetime" [(value)]="value">
  Choose date and time
</button>
```

Inline valid completed actions commit immediately. Transient presentations edit an isolated draft: Confirm submits; X, Escape, and backdrop discard it. Only single `date` mode in calendar view auto-submits a selected day. Manual entry always requires Confirm in a transient presentation. Now validates and commits immediately. The host owns clearing: `appointment.setValue(null)`.

For an anchored overlay, install the CDK major matching Angular, import `WklyDateTimePickerOverlayModule` from `wkly-datetime-picker/cdk-overlay`, and include CDK's `overlay-prebuilt.css`:

```html
<input aria-label="Appointment" wklyDateTimePickerOverlay
  mode="datetime" [(value)]="value">
```

Trigger inputs are readonly displays; the picker is their editing mechanism. The base package does not resolve CDK. Material is a showcase dependency only.

## Configuration examples

```ts
import { WKLY_CONFIG, WKLY_LOCALIZATION, WKLY_CLOCK } from 'wkly-datetime-picker';
import { WklyGregorianCalendarAdapter } from 'wkly-datetime-picker.adapters';

// Application providers:
{ provide: WKLY_CONFIG, useValue: { locale: 'en-GB', weekOffset: 4 } }
{ provide: WKLY_LOCALIZATION, useValue: { confirm: 'Book this time' } }
{ provide: WKLY_CLOCK, useValue: { now: () => new Date('2099-12-16T13:00:00.000Z') } }

// Host fields:
adapter = new WklyGregorianCalendarAdapter('fi-FI');
viewport = { kind: 'full-month-and-around', extraWeeksBefore: 1, extraWeeksAfter: 1 };
disabledDate = (epochDay, context) => context.calendarDate.day === 25;
disabledTime = (seconds, context) => seconds < 9 * 3600;
weekLabel = (week, calendar) => `W${week.absoluteWeek}`;
```

```html
<wkly-datetime-picker mode="datetime-range" [calendarAdapter]="adapter"
  locale="fi-FI" [viewportPreset]="viewport" [weekLabelFormatter]="weekLabel"
  min="2099-12-01T00:00:00.000Z" max="2100-01-31T23:59:00.000Z"
  [isDateDisabled]="disabledDate" [isTimeDisabled]="disabledTime"
  [allowRangeAcrossDisabled]="false" [required]="true">
</wkly-datetime-picker>
```

Register Angular locale data locally. Explicit per-picker offset takes precedence over application configuration and locale data. Offset `0` is a real Thursday-start offset. Runtime locale changes recreate the generator while retaining the focused epoch day.

Custom calendars implement `WklyCalendarAdapter`. Conversions must round-trip epoch days, report supported ranges, preserve impossible drafts, and provide stable month codes across varying year/month lists. The complete [showcase Hebrew adapter](projects/wkly-datetime-picker.showcase/src/hebrew-adapter.ts) is an extension example and is excluded from published packages.

## Styling

```css
wkly-datetime-picker {
  --wkly-background-color: #fff;
  --wkly-text-color: #192c28;
  --wkly-muted-color: #52635e;
  --wkly-border-color: #dce5e1;
  --wkly-accent-color: #5146a5;
  --wkly-accent-text-color: #fff;
  --wkly-range-color: #e5f1ee;
  --wkly-error-color: #b42318;
  --wkly-focus-color: #245bd6;
  --wkly-size-multiplier: 1.15;
}
```

The effective multiplier is clamped to `1..1.5`; touch targets remain at least 44 pixels. At 320 pixels the decorative week-number column collapses so all seven day targets remain usable. Forced-colors and reduced-motion preferences are respected.

## Coordinates and migration

Gregorian epoch day zero is `1970-01-01`. Core knows no calendar, `Date`, `Intl`, locale, or clock.

```text
absoluteWeek = floor((epochDay - weekOffset) / 7)
firstEpochDay = absoluteWeek * 7 + weekOffset
```

Negative coordinates use mathematical floor division. Offset zero's week `-1` contains days `-7..-1`. Offset four represents Monday. Jumps compute one coordinate instead of walking months; default caching is an immutable-offset LRU of at most 256 weeks. The virtual viewport uses a recentered scroll runway and three overscan rows on each side.

Migration from the original draft: Gregorian and `isoWeek` fields were removed from core week models. Use adapter conversion and `formatWeekLabel`. ISO mode labels the week containing a physical row's first day.

## Verification

```sh
npm run build
npm test
npm run showcase:build
npm run showcase:browsers
npm run showcase:test:e2e
npm run showcase:test:e2e:update  # intentional baseline updates only
npm run pack:check
```

The pack check examines only the three publishable packages. Nothing is published automatically. See [API reference](docs/API.md) and [showcase instructions](projects/wkly-datetime-picker.showcase/README.md).

On Node 20+, browser tests use current Playwright/browser releases. Node 16/18 selects a compatible legacy Playwright runner for interaction tests; current-browser screenshot comparisons run on Node 20+ only. Use `showcase:browsers` to install the browser versions matching the selected runner. CI uses Node 22 and all four browser projects.
