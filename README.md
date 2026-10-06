# WKLY date/time picker

WKLY is an Angular date and time picker with a continuous, scrollable calendar. Use it to select a date, a time, a date and time, or a range. It supports inline placement, dialogs, reactive forms, localized labels, and custom calendars.

- [Install and choose a version](#install-and-choose-a-version)
- [Add your first picker](#add-your-first-picker)
- [Configure selection and validation](#configure-selection-and-validation)
- [Use Angular forms](#use-angular-forms)
- [Open a dialog or anchored overlay](#open-a-dialog-or-anchored-overlay)
- [Customize the appearance](#customize-the-appearance)
- [Choose a locale and time format](#choose-a-locale-and-time-format)
- [Use a different calendar](#use-a-different-calendar)
- [Set application defaults](#set-application-defaults)
- [Use public types and methods](#use-public-types-and-methods)

Showcase: [https://cokkto.github.io/wkly-datetime-picker](https://cokkto.github.io/wkly-datetime-picker)

## Install and choose a version

Install `@wkly/datetime-picker` with the same major version as your Angular application. Angular 11–22 have corresponding package version lines.

For Angular 19:

```sh
npm install @wkly/datetime-picker@19.x.x
```

The `latest` npm dist-tag follows the highest supported Angular major (currently 22). Use `@wkly/datetime-picker@latest` for that line, or `@wkly/datetime-picker@angular-N` for a specific supported major.

For another supported Angular major, replace `19` with that number. Keep the major in your dependency range when updating.

Versions follow `N.S.A`: `N` is the Angular major, `S` is the shared revision, and `A` is the revision for that Angular integration. For example, an Angular 19 fix advances `19.2.21` to `19.2.22`; a shared update advances the supported lines to `N.3.0`. Your application must satisfy the package's Angular and RxJS peer dependencies. CDK is optional and is needed only for the anchored overlay.

## Add your first picker

Import `WklyDateTimePickerModule` into the component that uses the picker. This complete standalone example works with Angular 19:

```ts
import { Component } from '@angular/core';
import {
  WklyDateTimePickerModule,
  WklyPickerValue,
} from '@wkly/datetime-picker';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [WklyDateTimePickerModule],
  template: `<wkly-datetime-picker
    mode="date"
    [(value)]="value"
    ariaLabel="Booking date">
  </wkly-datetime-picker>`,
})
export class BookingComponent {
  value: WklyPickerValue = null;
}
```

Selecting a valid date updates `value`. Set it to `null` to clear the selection. In an application using NgModules, add `WklyDateTimePickerModule` to the `imports` of the module that declares your host component.

### Choose what the user can select

Set `mode` to one of these six values:

| Mode | Selection | Example value |
| --- | --- | --- |
| `date` | One date | `'2099-12-16T00:00:00.000Z'` |
| `time` | One time | `'0000-01-01T13:00:00.000Z'` |
| `datetime` | One date and time; the default | `'2099-12-16T13:00:00.000Z'` |
| `date-range` | Two dates | `['2099-12-16T00:00:00.000Z', '2099-12-17T00:00:00.000Z']` |
| `time-range` | Two times | `['0000-01-01T09:00:00.000Z', '0000-01-01T17:00:00.000Z']` |
| `datetime-range` | Two dates and times | `['2099-12-16T13:00:00.000Z', '2099-12-17T15:00:00.000Z']` |

An empty selection is `null`. A completed range is an ordered readonly pair.

In manual entry for `date-range` and `datetime-range`, the End section lets you switch between calendar-date fields and **In X days**. The number always reflects the current end date relative to the start date, including calendar selections and programmatic writes. Enter or step through integers from `-9999` to `9999`; `0` selects the same calendar date as Start. Endpoint times are preserved. A negative count previews an earlier end date, then swaps the endpoints when the field edit settles (typing: one second, wheel: 140 ms, touch: release, or Enter/blur). Both views use the same validation and keep the same height.

Entering manual mode initializes missing range endpoints so you can edit only End. An empty range uses `initialEpochDay` from the picker or application configuration, falling back to the current UTC day. Its time uses the same initialization as **Now**, including current UTC hours, minutes and visible seconds rounded to their configured steps. A partial range copies its selected endpoint to the missing endpoint; supplied selections and edited drafts are preserved. Valid defaults commit inline, while dialogs and overlays wait for Confirm.

**Values are Gregorian UTC ISO strings.** WKLY does not convert timezones. Date selections use midnight, and time selections use the fixed date `0000-01-01`. Milliseconds must be `.000`; seconds must be `00` unless shown. Convert your application's timezone outside the picker. These rules also apply when the display uses a different calendar.

## Configure selection and validation

Use inputs to limit available values and outputs to respond to user actions. For example, extend the first picker to require a date within a booking window:

```html
<wkly-datetime-picker
  mode="date"
  [(value)]="value"
  min="2099-12-01T00:00:00.000Z"
  max="2099-12-31T00:00:00.000Z"
  [required]="true"
  (validationChange)="errors = $event">
</wkly-datetime-picker>
```

Add this field to the host component, importing `WklyValidationError` from `@wkly/datetime-picker`:

```ts
errors: readonly WklyValidationError[] = [];
```

Invalid edits leave the last committed value intact. Inspect `errors` to present feedback in your own UI. Each error has a `code` and `messageKey`, with optional `endpoint`, `field`, `rejectedValue`, and `details`.

### Selection and validation inputs

| Input | Default | Use it to |
| --- | --- | --- |
| `mode` | `'datetime'` | Choose one of the six selection modes above |
| `value` | `null` | Set the selection; use `[(value)]` for two-way binding |
| `required` | `false` | Report an empty selection as incomplete |
| `disabled` | `false` | Prevent interaction |
| `min`, `max` | `null` | Set inclusive bounds using canonical values for the selected mode |
| `isDateDisabled` | `null` | Reject dates with a predicate receiving an epoch day and its calendar context |
| `isTimeDisabled` | `null` | Reject times with a predicate receiving seconds since midnight and selection context |
| `allowRangeAcrossDisabled` | `false` | Allow a range to cross disabled values; its endpoints must still be valid |
| `rangeValidator` | `null` | Validate a complete ordered range and its range mode |
| `validators` | `[]` | Supply additional value callbacks returning a `WklyValidationError` or `null` |

An epoch day is an integer day index, with `1970-01-01 = 0`. Disabled-date callbacks also receive a `calendarDate`, so you can use calendar fields without calculating them yourself. Callback context identifies the selection mode and endpoint (`single`, `start`, or `end`).

### Display and behavior inputs

| Input | Default | Use it to |
| --- | --- | --- |
| `locale` | Application configuration, then Angular `LOCALE_ID` | Set localized date labels, digits, and default time display |
| `calendarAdapter` | Gregorian adapter for the effective locale | Use a custom calendar |
| `translations` | Injected translation catalog | Supply localized action and validation labels |
| `weekOffset` | `null`: use application/locale settings | Choose the first day of the week: `0` Thursday, `1` Friday, `2` Saturday, `3` Sunday, `4` Monday, `5` Tuesday, `6` Wednesday |
| `viewportPreset` | `{ kind: 'full-month' }` | Show a month, a month with surrounding weeks, or a fixed number of weeks. Choose `'full-month'`, `'full-month-and-around'`, or `'weeks'` |
| `hourCycle` | `'locale'` | Choose `'locale'`, `'h12'`, `'h24'`, or `'switchable'` |
| `showSeconds` | `false` | Show and edit seconds |
| `minuteStep`, `secondStep` | `1` | Set allowed increments; each must be a positive divisor of 60 |
| `weekLabelMode` | `'locale'` | Choose `'locale'`, `'iso'`, `'absolute-week'`, or `'hidden'` |
| `weekLabelFormatter` | `null` | Override week labels with a callback receiving the week and adapter |
| `ariaLabel` | `null` | Replace the default accessible name, “Date and time picker” |
| `ariaDescribedBy` | `null` | Associate help or error text by element ID |
| `initialEpochDay` | `null` | Set the initial calendar position and empty manual range date; otherwise use the application default or UTC today |
| `weekCacheSize` | `256` | Limit cached weeks; `0` disables caching |
| `overscanWeeks` | `3` | Render extra weeks on either side of the viewport; supported range is `0..50` |
| `closeOnBackdrop` | `true` | Allow a dialog or overlay to close when its backdrop is clicked |

For a compact four-week view, bind `[viewportPreset]="{ kind: 'weeks', visibleWeekCount: 4 }"`. For a month with surrounding weeks, use `{ kind: 'full-month-and-around', extraWeeksBefore: 1, extraWeeksAfter: 1 }`. Fixed week counts support `1..52`; surrounding counts support `0..52`.

### Outputs

| Output | Event value | When to use it |
| --- | --- | --- |
| `valueChange` | `WklyPickerValue` | Respond to a changed, successfully committed selection; also powers `[(value)]` |
| `validationChange` | `readonly WklyValidationError[]` | Update validation feedback |
| `viewportChange` | `WklyViewportChange` | Track the first and last visible weeks and the anchor week |
| `viewModeChange` | `'calendar'` or `'manual'` | Track switching between the calendar and manual entry |
| `opened` | No payload | Respond when a dialog or overlay opens |
| `closed` | `WklyCloseReason` | Distinguish submission from dismissal of a dialog or overlay |

Inline completed selections commit immediately. A dialog or overlay edits a draft: Confirm submits, while X, Escape, and backdrop dismissal discard the draft. Selecting a single date in calendar view can submit automatically; manual entry requires Confirm. Now validates and commits immediately.

## Use Angular forms

Import `ReactiveFormsModule` alongside `WklyDateTimePickerModule` in the host component or NgModule. Create a control in the component:

```ts
import { FormControl } from '@angular/forms';

// Field in the host component:
appointment = new FormControl('2099-12-16T13:00:00.000Z');
```

```html
<wkly-datetime-picker
  [formControl]="appointment"
  mode="datetime"
  [required]="true">
</wkly-datetime-picker>
```

Use the form control as the value source for this picker. Call `appointment.setValue(null)` to clear it, or `appointment.disable()` to disable it. The picker implements Angular's value accessor and validation contracts; programmatic writes do not emit a user change through the registered form callback.

## Open a dialog or anchored overlay

The native dialog directive is included in `WklyDateTimePickerModule`:

```html
<button wklyDateTimePickerDialog mode="date" [(value)]="value">
  Choose booking date
</button>
```

To anchor a picker to an input, install the Angular CDK major matching your application:

```sh
npm install @angular/cdk@19
```

Import `WklyDateTimePickerOverlayModule` from `@wkly/datetime-picker/cdk-overlay` into the host component or NgModule, and include `@angular/cdk/overlay-prebuilt.css` in your application's global styles.

```html
<input
  aria-label="Booking date"
  wklyDateTimePickerOverlay
  mode="date"
  [(value)]="value">
```

Trigger inputs are readonly displays; users edit through the picker. Both triggers accept the selection and display inputs above and expose the same outputs.

## Customize the appearance

Set CSS variables directly on the `wkly-datetime-picker` element. For example, add this rule to your global stylesheet to theme inline, dialog, and overlay pickers:

```css
wkly-datetime-picker {
  --wkly-background-color: #ffffff;
  --wkly-text-color: #20243a;
  --wkly-accent-color: #5146a5;
  --wkly-accent-color-alternate: #dcd8f2;
  --wkly-accent-text-color: #ffffff;
  --wkly-range-color: #eeecf8;
  --wkly-size-multiplier: 1.15;
}
```

For one inline picker, add a class to its element and scope the rule to that class. Dialog and overlay pickers are created outside the trigger's DOM subtree, so use a global picker rule to theme those presentations.

These are all available picker CSS variables:

| Variable | Default | Controls |
| --- | --- | --- |
| `--wkly-background-color` | `#fff` | Picker surface |
| `--wkly-background-color-alternate` | `#fafafa` | Alternating week backgrounds |
| `--wkly-text-color` | `#192c28` | Main text |
| `--wkly-muted-color` | `#52635e` | Secondary labels and text |
| `--wkly-border-color` | `#dce5e1` | Borders and separators |
| `--wkly-accent-color` | `#176c55` | Selection and primary actions |
| `--wkly-accent-color-alternate` | `#6ea494` | Hover and secondary accent states |
| `--wkly-accent-text-color` | `#fff` | Text on an accent background |
| `--wkly-range-color` | `#e5f1ee` | Selected range background |
| `--wkly-error-color` | `#b42318` | Invalid fields and errors |
| `--wkly-focus-color` | `#245bd6` | Keyboard focus indicators |
| `--wkly-size-multiplier` | `1` | Overall text scale, clamped to `1..1.5` |
| `--wkly-size-unit` | `3.5em` | Base dimensions for controls and calendar cells |

Changing size variables affects the space required by the calendar. Check your containing layout at the widths and scales your application uses.

## Choose a locale and time format

Register the Angular locale data you need, then set the picker locale:

```ts
import { registerLocaleData } from '@angular/common';
import enGb from '@angular/common/locales/en-GB';

registerLocaleData(enGb);
```

```html
<wkly-datetime-picker
  mode="datetime"
  [(value)]="value"
  locale="en-GB"
  hourCycle="h24"
  [minuteStep]="5"
  [showSeconds]="true">
</wkly-datetime-picker>
```

`locale` controls localized calendar labels and digits. `hourCycle="locale"` follows the locale, `h12` uses AM/PM, `h24` uses 24-hour time, and `switchable` lets the user change the display. Use `secondStep` to limit seconds when they are shown. Display choices do not change the UTC value format.

### Translate buttons and messages

English action and validation labels are included. Supply a `WklyTranslations` catalog with regional keys such as `en-GB` or `he-IL`, language keys such as `en` or `he`, or both. For each label, lookup tries the full locale and then progressively broader tags: `en-GB` checks `en-GB`, then `en`; `zh-Hant-TW` checks `zh-Hant-TW`, `zh-Hant`, then `zh`. Catalog keys are case-insensitive. A regional entry can override some labels while inheriting others from its language entry.

Add a catalog to the host component, importing `WklyTranslations` from `@wkly/datetime-picker`:

```ts
translations: WklyTranslations = {
  'en-GB': {
    confirm: 'Book this time',
  },
  en: {
    now: 'Use current time',
    'below-minimum': 'Choose a later booking date.',
  },
  'he-IL': {
    now: 'עכשיו',
  },
};
```

```html
<wkly-datetime-picker
  mode="datetime"
  [(value)]="value"
  locale="en-GB"
  [translations]="translations">
</wkly-datetime-picker>
```

Label precedence is `WKLY_LOCALIZATION` overrides, matching regional/script catalog entries, the language catalog entry, then built-in English. Unknown keys fall back to the key itself. An input catalog replaces the injected `WKLY_TRANSLATIONS` catalog for that picker, including when the input is empty; `null` uses the injected catalog. Lookup does not use a different region's entry. Available keys cover actions, date/time fields, navigation, range endpoints, and validation codes; see the [English label catalog](https://github.com/cokkto/wkly-datetime-picker/blob/main/projects/wkly-datetime-picker/src/public-api.ts). The injection tokens are described below.

The relative-day view uses `inDays` (default `"In {{days}} days"`), `days`, `endDate`, `daysPrevious`, `daysNext`, and `daysUnavailable`. The picker replaces `{{days}}` with the localized number; `daysUnavailable` is shown when an incomplete or impossible date prevents calculating the difference.

## Use a different calendar

The included calendar adapter is `WklyGregorianCalendarAdapter`, available from `@wkly/adapters`. It is selected automatically and supports Gregorian years `0000..9999` with localized labels. `WklyCalendarAbstractAdapter` is an optional base class for custom adapters, providing reusable locale formatters.

For another calendar, supply a `WklyCalendarAdapter` through `[calendarAdapter]`. The [Hebrew adapter](https://github.com/cokkto/wkly-datetime-picker/blob/main/projects/wkly-datetime-picker.showcase/src/hebrew-adapter.ts) and [Hijri adapter](https://github.com/cokkto/wkly-datetime-picker/blob/main/projects/wkly-datetime-picker.showcase/src/hijri-adapter.ts) are available as source from Git; neither is shipped in npm packages. Copy their source into your application. Hebrew requires `@hebcal/core`; Hijri has no additional dependency beyond WKLY and the platform's `Intl` calendar formatting.

After adding that example as `calendar/hebrew-adapter.ts` and installing its `@hebcal/core` dependency, configure it in your component:

```ts
import { ShowcaseHebrewCalendarAdapter } from './calendar/hebrew-adapter';

// Field in the host component:
calendarAdapter = new ShowcaseHebrewCalendarAdapter('he-IL');
```

```html
<wkly-datetime-picker
  mode="date"
  [(value)]="value"
  locale="he-IL"
  [calendarAdapter]="calendarAdapter">
</wkly-datetime-picker>
```

Register the matching Angular locale data and supply Hebrew action labels as needed. The adapter changes calendar conversion and date formatting; selected values remain Gregorian UTC strings.

For Hijri, copy `hijri-adapter.ts` and use the same picker binding with Arabic locale data and action labels:

```ts
import { ShowcaseHijriCalendarAdapter } from './calendar/hijri-adapter';

calendarAdapter = new ShowcaseHijriCalendarAdapter('ar-EG');
```

```html
<wkly-datetime-picker mode="date" [(value)]="value" locale="ar-EG"
  [calendarAdapter]="calendarAdapter">
</wkly-datetime-picker>
```

Both examples support Gregorian UTC dates `1900-01-01..2100-12-31`, inclusive. Hijri implements `islamic-civil`, the tabular civil variant: a Friday epoch (Gregorian `0622-07-19`), alternating 30/29-day months, and leap years 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, and 29 in each 30-year cycle. The last month has 30 days in leap years. This follows [Unicode's civil calendar definition](https://github.com/unicode-org/cldr/blob/main/common/bcp47/calendar.xml); it does not implement moon-sighting or Umm al-Qura rules. Conversion uses integer arithmetic; `Intl` supplies localized month labels only. The showcase's calendar page connects Gregorian, Hebrew, and Hijri selections to the same UTC day.

A custom adapter provides supported date bounds, reversible date conversion, month lists, validation, and display/accessibility labels. It must preserve invalid manual drafts for validation and stable month identities across years. See the [calendar adapter contract](https://github.com/cokkto/wkly-datetime-picker/blob/main/docs/API.md#adapters) for the complete interface.

## Set application defaults

Provide these tokens at application level to share configuration across pickers. Import them from `@wkly/datetime-picker`.

| Token | Value type and default | Purpose |
| --- | --- | --- |
| `WKLY_CONFIG` | `WklyConfiguration`; `{}` | Default `locale`, `weekOffset`, and `initialEpochDay` |
| `WKLY_TRANSLATIONS` | `WklyTranslations`; `{}` | A language-to-label catalog shared across pickers |
| `WKLY_LOCALIZATION` | `WklyStrings`; `{}` | Override individual action or validation labels, regardless of locale |
| `WKLY_CLOCK` | `WklyClock`; `{ now: () => new Date() }` | Supply the clock used for today and Now; useful for deterministic tests |

For example, define a provider array and include it in your application configuration's `providers`, or your root NgModule's `providers`:

```ts
import { Provider } from '@angular/core';
import {
  WKLY_CONFIG,
  WKLY_LOCALIZATION,
} from '@wkly/datetime-picker';

export const bookingPickerProviders: Provider[] = [
  {
    provide: WKLY_CONFIG,
    useValue: { locale: 'en-GB', weekOffset: 4 },
  },
  {
    provide: WKLY_LOCALIZATION,
    useValue: { confirm: 'Book this time' },
  },
];
```

Explicit picker settings take precedence over `WKLY_CONFIG`. When no locale is supplied, the picker uses Angular's `LOCALE_ID`. When no week offset is supplied, it resolves the start of the week from the effective locale. Offset `0` is an explicit Thursday start.

## Use public types and methods

Use the public types when integrating with forms, application state, validation, or custom presentation.

| Type or interface | Import from | Purpose |
| --- | --- | --- |
| `WklyPickerValue`, `WklyIsoString`, `WklyRangeValue` | `@wkly/datetime-picker` | Type the nullable selection, UTC strings, and readonly range pairs |
| `WklySelectionMode`, `WklyHourCycle`, `WklyViewportPreset` | `@wkly/datetime-picker` | Type selection and display options |
| `WklyValidationError`, `WklyValidationErrorCode`, `WklyEndpoint` | `@wkly/datetime-picker` | Handle validation and identify the affected endpoint |
| `WklyDisabledDatePredicate`, `WklyDisabledTimePredicate`, `WklyRangeValidator` | `@wkly/datetime-picker` | Define availability rules and range validation |
| `WklyWeekLabelMode`, `WklyWeekLabelFormatter` | `@wkly/datetime-picker` | Choose or customize week labels |
| `WklyConfiguration`, `WklyStrings`, `WklyTranslations`, `WklyClock` | `@wkly/datetime-picker` | Type values supplied through injection tokens |
| `WklyViewportChange`, `WklyCloseReason`, `WklyJumpOptions` | `@wkly/datetime-picker` | Handle navigation, dismissal, and programmatic jumps |
| `WklyPresentationRef` | `@wkly/datetime-picker` | Access and destroy a presentation created through a presentation service |
| `WklyCalendarAdapter`, `WklyCalendarDate`, `WklyCalendarMonth`, `WklyCalendarDateError` | `@wkly/adapters` | Implement another calendar and its validation |
| `WklyDatePredicateContext`, `WklyTimePredicateContext`, `WklySelectionConfig` | `@wkly/adapters` | Work directly with predicate context and selection validation |
| `WklyPickerInputs`, `WklyPickerOutputs` | `@wkly/presentation` | Describe the shared binding contracts when building presentation extensions |

When importing an adapter or shared contract directly, declare its package as a direct dependency of your application.

The component and dialog/overlay triggers provide `scrollToEpochDay`, `scrollToAbsoluteWeek`, `scrollToCalendarDate`, and `scrollToValue`. Pass `WklyJumpOptions` to choose alignment (`start`, `center`, or `end`), focus, and whether to select the target. Defaults are center alignment with no focus or selection change. A trigger opens its presentation before navigating; triggers also expose `open()` and `close()`.

For custom hosts, `WklyDateTimePickerDialogService` and `WklyDateTimePickerOverlayService` create presentations. The overlay service is imported from `@wkly/datetime-picker/cdk-overlay`. See the [API reference](https://github.com/cokkto/wkly-datetime-picker/blob/main/docs/API.md) for method signatures and extension contracts.

WKLY is [MIT licensed](LICENSE). Contributors can start with the [project documentation](https://github.com/cokkto/wkly-datetime-picker/blob/main/docs/README.md).
