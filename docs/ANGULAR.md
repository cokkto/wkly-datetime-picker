# Shared presentation and Angular integration

## Package boundary

`projects/wkly-datetime-picker/` owns Angular-independent input/output names, configuration and localization types, week-row and draft-validation helpers, and the shared picker stylesheet. Its [package README](../projects/wkly-datetime-picker/README.md) lists the source files and package role.

Each `projects/wkly-datetime-picker.N/` build target, for N=11–22, owns the matching Angular component, form integration, native-dialog directive, and optional `cdk-overlay/` entry point. These projects import the three shared packages; shared packages do not import Angular. `src/public-api.ts` is the main entry point, `src/picker.component.ts` and `src/picker.component.html` implement the UI, `src/presentation.ts` owns transient presentation, and `src/config.ts` owns Angular injection tokens. The published picker uses one name, `@wkly/datetime-picker`, with a version major matching Angular. The [API reference](API.md) has public signatures and defaults.

## Behavior to preserve

The calendar renders continuous absolute-week rows with a recentered scroll runway and overscan. The viewport preset changes how many weeks are visible, while month/year annotations are presentation metadata. Inline valid completed actions commit immediately. Native dialog and CDK overlay edit an isolated draft; Confirm submits, while X, Escape, and backdrop discard. Single-date calendar selection can auto-submit in a transient view; manual entry requires Confirm. The host clears by writing `null`.

With `hourCycle="switchable"`, the chosen AM/PM or 24-hour format survives host value feedback and unrelated input updates. Changing the `hourCycle` setting resolves the format again.

Forms use `ControlValueAccessor` and `Validator`. Programmatic writes do not call the registered change callback. Invalid drafts retain the last committed value. Explicit picker inputs override application configuration, which precedes locale defaults. Register Angular locale data in the host application. CSS variables in `src/picker.component.css` control theme and size; the built package exposes `picker.css`.

Manual date ranges expose End / In X days buttons. The relative-day field reuses `WklyFieldComponent` and projects signed calendar-day offsets onto the existing end draft, preserving its time. Its value and toggle text are derived from the drafts; calendar selections, date-field edits, start changes, and external writes update them. The two layouts share four rows and align their editable fields. Endpoint controls track their index to preserve focus when drafts swap. Calendar selection and manual field completion share the same ordering method; typing completes after one second, wheel after 140 ms, and touch on release. Unsupported relative end days stay on the end draft for normal validation until corrected; there is no separate selection or validation store.

Entering manual mode completes missing date-range endpoints. Empty ranges resolve the date from the explicit `initialEpochDay`, application configuration, then the current UTC day; their time uses `clockDraft`, the same helper as Now, including minute/second step rounding. Partial selections seed only their missing endpoint, preserving existing drafts and times. Initialization uses normal completion and validation: valid inline defaults commit, transient defaults wait for Confirm. It marks the view for checking after synchronous viewport positioning so dynamically created views refresh Confirm's enabled state.

Label resolution is shared across Angular majors: `WKLY_LOCALIZATION` overrides precede case-insensitive catalog lookup from the full locale to broader tags, followed by built-in English. Regional catalogs can inherit missing keys from language entries. A picker input catalog replaces `WKLY_TRANSLATIONS`; `null` retains injection. Dialogs and overlays inherit scoped providers from their trigger's injector. See the [consumer localization examples](../README.md#choose-a-locale-and-time-format) and [API reference](API.md) for precedence and fallback rules.

The In X days resulting date displays the adapter's localized day, full month name, and year. Month names come from the calendar adapter's locale, matching the Month selector; action and validation labels use the translation catalog.

## Commands and related work

```sh
npm run lint -- --angular=22
npm run build
npm run pack:check
npm run showcase:start
npm run test:picker -- --project=angular-22-chromium-presentations
```

`npm run build` uses the newest Angular package by default; version-specific package builds need the matching Node/TypeScript toolchain. Use [compatibility CI](COMPATIBILITY-CI.md) for isolated version checks, [showcase](SHOWCASE.md) for live cases, and the [regression log](REGRESSIONS.md) before changing calendar geometry.

Applications import the module and tokens from `@wkly/datetime-picker`, and optional CDK features from `@wkly/datetime-picker/cdk-overlay`. The installed `N.x.x` version selects the Angular integration. The unnumbered source project contains shared presentation code.
