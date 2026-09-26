# Public API

The Angular components, module, forms integration, and optional CDK entry point live in `wkly-datetime-picker.11` and `wkly-datetime-picker.18`. Choose the package matching your Angular major. `wkly-datetime-picker` provides Angular-independent presentation configuration, translations, input names, and CSS; date adapters remain in `wkly-datetime-picker.adapters`.

All APIs are exported from public package entry points. Emitted TypeScript declarations contain complete signatures and readonly contracts.

## Core

`EpochDay` and `AbsoluteWeek` are safe integer coordinate aliases. `WklyWeekOffset` is `0..6`. `integer(value)` validates safe integers. `floorDiv(a,b)` and `floorMod(a,b)` provide floor arithmetic for positive integer divisors. Invalid inputs and unsafe results throw `RangeError`.

`absoluteWeekOf(day,offset)` and `firstEpochDayOf(week,offset)` map coordinates in constant time. `generateWeek(week,offset)` returns a frozen `WklyWeek` with `absoluteWeek`, `weekOffset`, and a frozen seven-element `epochDays` tuple.

`createWeekGenerator(options?: WklyWeekGeneratorOptions)` returns `WklyWeekGenerator`: readonly offset/cache size, `getWeek(week)`, and `clearCache()`. Defaults are offset 0 and cache size 256; zero disables caching. Cache eviction is LRU.

`WklyViewportState` describes anchor/first/last weeks, focused day, active range endpoint, and calendar/manual view. `orderedRange(start,end,compare)` returns a frozen ascending pair without modifying endpoints.

## Adapters

`WklyGregorianCalendarAdapter(locale='en-US')` implements proleptic Gregorian years 0–9999 using integer arithmetic. Low-level `gregorianDay(year,month,day)` and `gregorianDate(epochDay)` expose raw conversion; use adapter methods for date and supported-range validation. `pad(number,width=2)` is the codec's decimal padding helper.

`WklyCalendarAbstractAdapter` implements the `WklyCalendarAdapter` contract with abstract calendar operations and protected `getDateTimeFormatter(options?, locale?)` and `getNumberFormatter(options?, locale?)` helpers. Each adapter instance reuses formatters for matching locale and options. Custom adapters can extend this class or implement `WklyCalendarAdapter` directly.

`WklyCalendarDate` has calendarId, year, one-based ordinal month, stable monthCode, day, and optional era. `WklyCalendarMonth` has month, monthCode, and label. `WklyCalendarDateError` has code, optional field, and messageKey.

| `WklyCalendarAdapter` member | Contract |
| --- | --- |
| calendarId | Stable calendar identity |
| supportedEpochDayRange, supportedYearRange | Inclusive supported bounds |
| validateDate(date) | Errors without correcting fields |
| dateToEpochDay(date), epochDayToDate(day) | Strict reversible conversions |
| getMonths(year,era?) | Ordered months with stable identities |
| getDaysInMonth(year,monthCode,era?) | Valid day count |
| addMonths(date,amount), addYears(date,amount) | Preserve impossible day drafts and month identity |
| formatDay, formatMonth, formatYear, formatDate, formatAccessibleDate | Localized date fields and accessible text |
| formatWeekday(day,width) | Short/long weekday |
| formatWeekLabel(week,mode) | Locale/ISO/absolute/hidden row label |
| normalizeDigits(input) | Recognized decimal digits to ASCII; other characters ignored |

`decodeIso(string)` returns `WklyDateTime {epochDay,hour,minute,second}` and rejects noncanonical input. `encodeIso(value,mode='datetime',showSeconds=false)` applies hidden-field normalization. `normalizeDigits(input)` is also a standalone helper. `resolveWeekOffset(locale,explicit?,application?,firstDay?)` applies precedence; optional locale firstDay uses Sunday=0 through Saturday=6.

`validateSelection(value,config,adapter)` returns readonly `WklyValidationError[]` without repairing the selection. `WklySelectionConfig` accepts mode, showSeconds, minuteStep, secondStep, min, max, required, disabled predicates, allowRangeAcrossDisabled, rangeValidator, and additional validators. `WklyValidationException.errors` exposes conversion failures. `error(code,rejectedValue?,field?,endpoint?)` constructs the stable error object.

| Public type | Meaning |
| --- | --- |
| WklySelectionMode | datetime, date, time, and their -range variants |
| WklyIsoString | Canonical UTC ISO string |
| WklyRangeValue | Readonly pair of strings |
| WklyPickerValue | String, range, or null |
| WklyEndpoint | single, start, end |
| WklyDatePredicateContext | mode, endpoint, calendarDate |
| WklyTimePredicateContext | mode, endpoint |
| WklyDisabledDatePredicate | (epochDay,context) => boolean |
| WklyDisabledTimePredicate | (secondsSinceMidnight,context) => boolean |
| WklyRangeValidator | (range,rangeMode) => error or null |
| WklyWeekLabelMode | locale, iso, absolute-week, hidden |
| WklyWeekLabelFormatter | (week,adapter) => string |
| WklyHourCycle | locale, h12, h24, switchable |
| WklyViewportPreset | full-month; full-month-and-around with extraWeeksBefore/After; weeks with visibleWeekCount |

Validation errors contain code, messageKey, and optional endpoint, field, rejectedValue, details. Stable codes: malformed-iso, wrong-value-shape, incomplete, invalid-calendar-date, unsupported-adapter-date, below-minimum, above-maximum, disabled-endpoint, range-crosses-disabled, invalid-time, step-mismatch, custom-validator, configuration-error.

## Angular

`WklyDateTimePickerModule` exports component `wkly-datetime-picker` and directive `[wklyDateTimePickerDialog]` (exportAs wklyDialog), including forms accessors/validators. Adapters are imported separately.

| Shared input | Default |
| --- | --- |
| mode / value | datetime / null |
| calendarAdapter / locale | Gregorian / LOCALE_ID or application configuration |
| weekOffset | null: resolve configuration/locale |
| viewportPreset | full-month |
| hourCycle / showSeconds | locale / false |
| minuteStep / secondStep | 1 / 1; positive integer divisors of 60 |
| min / max | null / null, inclusive canonical bounds |
| isDateDisabled / isTimeDisabled / rangeValidator | null |
| allowRangeAcrossDisabled / required / disabled | false |
| weekLabelMode / weekLabelFormatter | locale / null |
| weekCacheSize / overscanWeeks | 256 / 3 |
| ariaLabel / ariaDescribedBy | null |
| initialEpochDay | null; selected value precedes initial anchor, then UTC today |
| closeOnBackdrop | true |
| validators | Empty readonly array of value => error/null callbacks |

Boolean attributes are coerced. Supported visibleWeekCount is 1–52, extra rows 0–52, overscan 0–50. Invalid numeric configuration reports configuration-error.

The visible calendar stops at weeks containing dates inside both the adapter's `supportedYearRange` and `supportedEpochDayRange`. The default `DEFAULT_OVERSCAN_WEEKS` is 3; these rendered buffer weeks remain outside the visible viewport and can be blank at a range edge.

Outputs: valueChange (changed successful commits only), validationChange (readonly errors), opened, closed, viewportChange, viewModeChange. `WklyCloseReason` is submit, auto-submit, now, close-button, escape, backdrop, or programmatic. `WklyViewportChange` contains firstVisibleAbsoluteWeek, lastVisibleAbsoluteWeek, anchorAbsoluteWeek.

The component and triggers expose scrollToEpochDay, scrollToAbsoluteWeek, scrollToCalendarDate, and scrollToValue. `WklyJumpOptions` contains optional focus=false, select=false, align=center (start/end also supported). Triggers expose open and close. Component field-action methods include toggleView, select, now, finish, submit, cancel, and focusDay; normal consumers use the UI and outputs.

Forms methods follow ControlValueAccessor/Validator: writeValue, registerOnChange, registerOnTouched, setDisabledState, validate, registerOnValidatorChange. Programmatic writes never invoke the registered change callback. Invalid drafts leave the last committed value intact.

`WKLY_CLOCK` provides `WklyClock {now(): Date}`. `WKLY_CONFIG` provides readonly `WklyConfiguration {locale?,weekOffset?,initialEpochDay?}`. `WKLY_LOCALIZATION` provides per-instance `WklyStrings` overrides. `WKLY_TRANSLATIONS` accepts an optional locale-to-strings catalog; the showcase supplies its Arabic and Hebrew translations. Missing keys fall back to English. `coerceBoolean` is the shared attribute coercion helper.

`WklyDateTimePickerDialogService.open(trigger,onCancel,backdrop=true)` returns `WklyPresentationRef {component,destroy()}` for custom hosts. The shared `WklyPickerInputs` interface defines input property names and types; each Angular package implements it with Angular decorators. `WklyTriggerBase` and `INPUT_NAMES` support presentation extensions. `WklyFieldComponent` is the numeric/wheel primitive with value, label, min/max/step, locale, disabled, invalid, optional labels inputs and valueChange/complete outputs; use the full picker for application forms.

## Optional CDK entry point

`wkly-datetime-picker.N/cdk-overlay` exports `WklyDateTimePickerOverlayModule`, `WklyDateTimePickerOverlayDirective` (`[wklyDateTimePickerOverlay]`, exportAs wklyOverlay), and `WklyDateTimePickerOverlayService` for registered majors N (currently 11 and 18). The directive inherits the shared API. Service open(trigger,onCancel,backdrop=true) returns WklyPresentationRef using CDK Overlay and its focus trap. Install the matching Angular CDK major and include overlay-prebuilt.css. Base/native-dialog imports do not load CDK.
