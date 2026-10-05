# Test coverage index

All active tests live in [the test project](../projects/wkly-datetime-picker.tests/) or [scripts](../scripts/). This index links the assertions; use the [developer guide](README.DEV.md#checks) for commands and [compatibility CI](COMPATIBILITY-CI.md#pipeline) for GitHub jobs.

## Picker browser domains

[playwright.config.ts](../projects/wkly-datetime-picker.tests/playwright.config.ts) selects projects from [supported-angular.json](../supported-angular.json), the [domain registry](../scripts/test-domains.cjs) and [browser selection](../scripts/test-browsers.cjs). Each version/browser/domain owns one context in America/New_York. Its suite pages boot Angular once, then mount and destroy a fresh fixture for every scenario. The [fixtures](../projects/wkly-datetime-picker.tests/e2e/fixtures.ts) and [runner](../scripts/test-domains-run.cjs) check teardown, page reuse and complete unfiltered runs without skips or retries.

| Spec                                                                                                                  | Coverage                                                                                                                                 | Reusable pages                                       | Journeys per version/engine |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------- |
| [values-forms.spec.ts](../projects/wkly-datetime-picker.tests/e2e/domains/values-forms.spec.ts)                       | Canonical values, validation, external writes, CVA/forms, disabled/required behavior and selection starting states                       | values, forms                                        | 15                          |
| [selection-editing.spec.ts](../projects/wkly-datetime-picker.tests/e2e/domains/selection-editing.spec.ts)             | Calendar selection, manual/date/time fields, wheel settlement, typing debounce, range swapping and step constraints                      | calendar, manual, time                               | 16                          |
| [navigation.spec.ts](../projects/wkly-datetime-picker.tests/e2e/domains/navigation.spec.ts)                           | Public jumps, keyboard/focus, week navigation, scrolling and render history, bounded overscan and live week columns                      | navigation, scrolling, scrolling-narrow at 125% zoom | 18                          |
| [presentations.spec.ts](../projects/wkly-datetime-picker.tests/e2e/domains/presentations.spec.ts)                     | Native/CDK/Material: commit/cancel, forms, focus restoration, immediate close, provider inheritance, adapter jumps and live week columns | native, cdk, material                                | 33                          |
| [calendars-configuration.spec.ts](../projects/wkly-datetime-picker.tests/e2e/domains/calendars-configuration.spec.ts) | Gregorian/Hebrew/Hijri adapters, localization/catalog precedence, configuration and linked calendars                                     | calendars, localization, configuration, paired       | 19                          |
| [layout.spec.ts](../projects/wkly-datetime-picker.tests/e2e/domains/layout.spec.ts)                                   | Geometry, resize/focus, day target sizes, RTL, theme/media settings, week columns and month-boundary labels/screenshots                  | 320px, 768px, 1280px, zoom 80%/125%/150%             | 17                          |
| [touch.spec.ts](../projects/wkly-datetime-picker.tests/e2e/domains/touch.spec.ts)                                     | Real taps/drags, field editing, scroll history, small-gesture stability and mobile viewport changes                                      | calendar, fields, scrolling; 390×844px, DPR 2        | 5; Chromium only            |

Desktop domains run Chromium, Firefox and WebKit. Touch uses Chromium's CDP input driver. Per Angular version: 123 Chromium journeys with seven contexts/24 pages, and 118 journeys with six contexts/21 pages for each other engine. Angular 11–22 across all engines totals 4,308 journeys, 228 contexts and 792 pages.

The layout spec has four screenshot cases per engine: Finnish and Hijri month boundaries at narrow and tablet widths. [Windows baselines](../projects/wkly-datetime-picker.tests/baselines/win32/) are shared across Angular versions. Other layout behavior uses assertions. CI runs picker domains on Windows; another operating system needs reviewed baselines before its screenshot checks can pass. Update deliberately with `npm run test:visuals:update`.

## Source and installed shared-package contracts

`npm run test:contracts` bundles these suites once and uses Node's native test runner in UTC and America/New_York: 135 assertions per timezone, 270 executions. `npm run test:packages:shared` runs the same suites against freshly packed, offline-installed shared packages, with integrity, declaration/entry and source-leak checks.

| Spec                                                                                                    | Coverage                                                                                                    |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [core-adapters.spec.ts](../projects/wkly-datetime-picker.tests/contracts/core-adapters.spec.ts)         | Week coordinates/generation, conversions, normalization, adapter formatting and shared presentation helpers |
| [values.spec.ts](../projects/wkly-datetime-picker.tests/contracts/values.spec.ts)                       | Value encoding, ranges, validation and immutable inputs                                                     |
| [iso-boundaries.spec.ts](../projects/wkly-datetime-picker.tests/contracts/iso-boundaries.spec.ts)       | ISO date/time and timezone boundaries                                                                       |
| [week-boundaries.spec.ts](../projects/wkly-datetime-picker.tests/contracts/week-boundaries.spec.ts)     | Continuous week rows, date/month/year boundaries and annotation rules                                       |
| [localization.spec.ts](../projects/wkly-datetime-picker.tests/contracts/localization.spec.ts)           | Translation fallback, catalog overrides, regional inheritance and localized labels                          |
| [callbacks.spec.ts](../projects/wkly-datetime-picker.tests/contracts/callbacks.spec.ts)                 | Callback ordering, selection validation and failure handling                                                |
| [example-calendars.spec.ts](../projects/wkly-datetime-picker.tests/contracts/example-calendars.spec.ts) | Hebrew/Hijri conversion, supported limits and calendar examples                                             |

CommonJS/ESM import smoke checks: [imports.cjs](../projects/wkly-datetime-picker.tests/packages/imports.cjs). Orchestration: [test-installed.cjs](../scripts/test-installed.cjs).

## Angular package qualification

| Source                                                                                                                                                 | Coverage                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| [startup.spec.cjs](../projects/wkly-datetime-picker.tests/packages/angular/startup.spec.cjs)                                                           | One packed-consumer journey per version/engine: startup, forms, native/CDK interaction and reload; 36 journeys for the full matrix |
| [main.ts](../projects/wkly-datetime-picker.tests/packages/angular/main.ts), [ssr.cjs](../projects/wkly-datetime-picker.tests/packages/angular/ssr.cjs) | Fresh base-without-CDK and optional-CDK public imports, AOT compilation and SSR without clock access                               |
| [compatibility.cjs](../scripts/compatibility.cjs), [verify-packed-consumer.cjs](../scripts/verify-packed-consumer.cjs)                                 | Pinned toolchains, source contracts, builds, tarballs, fresh consumer installs and integrity/entry checks                          |

`npm run test:packages:angular` qualifies fresh libraries; `test:packages:angular:reuse` rechecks prepared artifacts. The [test README](../projects/wkly-datetime-picker.tests/README.md#package-checks) explains pinned Node executables.

## Showcase browsers

| Spec                                                                                     | Coverage                                                                                                                                                 |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [testbeds.spec.cjs](../projects/wkly-datetime-picker.tests/showcase/testbeds.spec.cjs)   | Independently compiled versioned testbeds: four layout routes, controls, representative native/CDK/Material forms, commit/cancel/focus/reopen and reload |
| [catalogue.spec.cjs](../projects/wkly-datetime-picker.tests/showcase/catalogue.spec.cjs) | Evergreen routes, direct reload, linked calendars and navigation to a versioned host                                                                     |

`npm run showcase:build` prepares assets; `npm run test:showcase` runs 39 journeys across all versions and Chromium/Firefox/WebKit.

## Tooling contracts

`npm run test:tooling` uses Node's native test runner:

| Spec                                                            | Coverage                                                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [compatibility.test.cjs](../scripts/compatibility.test.cjs)     | Registry validation, affected/transitive package planning and consumer integrity |
| [lint.test.cjs](../scripts/lint.test.cjs)                       | Script and Angular template lint diagnostics                                     |
| [showcase-server.test.cjs](../scripts/showcase-server.test.cjs) | Host routing, fallback and isolation                                             |
| [test-check.test.cjs](../scripts/test-check.test.cjs)           | Development/push/PR/release selection and fresh/reused package qualification     |
| [test-host-server.test.cjs](../scripts/test-host-server.test.cjs) | Reused host routing after wider builds, missing-host startup failure and unrelated-server rejection |

`npm run test:lint` checks source, templates and tooling; `npm run test:typecheck` checks the current test project.
