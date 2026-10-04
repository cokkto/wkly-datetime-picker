# WKLY test project

This private project contains source contracts, installed-package contracts, packed Angular consumer fixtures, and browser tests. It is not published. Run commands from the repository root; install workspace dependencies and browser engines first.

| Area | Paths | Main check |
| --- | --- | --- |
| Shared behavior | `contracts.ts`, `contracts/`, `helpers/` | `npm test` runs in UTC and America/New_York |
| Installed shared packages | `contracts/` through `scripts/test-installed.cjs` | `npm run test:installed` builds, packs, installs, and tests shared packages |
| Active versioned browser suite | `e2e/testbeds.spec.ts`, `e2e/interaction/`, `e2e/visual/` | `npm run showcase:test:e2e -- --project=angular-22-chromium` |
| Packed Angular consumers | `compatibility/` | `npm run test:angular -- 22` with the matching prepared toolchain |
| Test tooling | `scripts/compatibility.test.cjs`, `scripts/lint.test.cjs` | `npm run ci:test` and `npm run lint:test` |

The active Playwright suite is selected by [`playwright.config.ts`](../../playwright.config.ts). It runs the same cases against independently compiled Angular 11–22 testbeds, with Chromium, Firefox, WebKit, Edge, Chromium DPR 1.5, and mobile Chromium profiles. `WKLY_ANGULAR=11,22` limits the versions. Playwright writes reports and failure artifacts to ignored `playwright-report/` and `test-results/`. Install engines with `npm run showcase:browsers`; Edge requires an installed branded browser.

`e2e/interaction/` checks selection, manual drafts, keyboard/touch behavior, and accessible state. `e2e/visual/` checks geometry and screenshot baselines. Screenshot comparisons describe appearance; layout assertions decide correctness. Update baselines only after reviewing the images. Current failures and focused commands are in [the regression log](../../docs/REGRESSIONS.md). The [development plan](../../docs/DEVELOPMENT-PLAN.md) tracks the fixes.

The browser server defaults to its own deterministic `WKLY_E2E=1` build and fixed clock. Set `WKLY_E2E_REUSE_SERVER=1` only when you already started a matching server. See [showcase usage](../../docs/SHOWCASE.md) for hosts and routes, [compatibility CI](../../docs/COMPATIBILITY-CI.md) for per-major toolchains, and the [developer guide](../../docs/README.DEV.md) for the full routine.

`e2e/interaction/angular-contracts.spec.ts` uses the versioned `/contracts` fixture to exercise public jump methods on inline, native-dialog, and CDK-overlay pickers, Gregorian, Hebrew, and Hijri adapter boundaries, scoped configuration/localization providers, runtime input changes, and accessible range endpoint edits. `contracts/localization.ts` checks exact regional/script/language fallback against source and installed shared packages.

`contracts/example-calendars.ts` checks Hebrew/Hijri conversion, boundaries, errors, leap months/years, and UTC wire values; the Hijri interval also matches an independent `Intl` oracle. `e2e/interaction/example-calendars.spec.ts` checks navigation, localized manual dates and times, range editing, boundary validation, and three-way paired synchronization under a non-UTC browser timezone. `e2e/visual/example-calendars.spec.ts` checks selected Hebrew/Hijri dates, localized month/year labels and mirrored RTL geometry at mobile/tablet/desktop widths, with browser-specific screenshots.

## Focused jumps and deferred focus

`e2e/interaction/angular-contracts.spec.ts` checks that a public focused jump synchronously moves the calendar's sole `tabindex="0"` to its target before deferred DOM focus runs. Each inline, dialog, and overlay check dispatches the host's jump action and reads tab stops in the same browser task, so a later timer or render cannot conceal stale attributes. The immediate-close cases also verify that deferred focus does not run on a destroyed picker and that reopening remains usable without value emissions.

On 2026-10-04, Angular 21 WebKit reproduced NG0100 in `dialog: immediate close cancels deferred jump focus` in 3 of 10 runs with retries disabled. The trace placed the error after the second `Jump value past` action reopened the dialog; Angular reported `attr.tabindex` changing from `0` to `-1`. `scrollToEpochDay` rendered through `position` before assigning `focused`. The three synchronous checks all found epoch day -20 as the tab stop after jumping to -16, and the dialog and overlay checks also caught NG0100.

Every Angular integration now assigns the requested focus day before that synchronous render. DOM focus remains deferred with the destruction guard intact. After the fix, all 50 repeated Angular 21 WebKit focused cases, 180 focused cases across Angular 11–22 Chromium/Firefox/WebKit, and 114 full Angular 21 contracts across those browsers passed with retries disabled. Full lint and source contracts in UTC and America/New_York also passed.

Focused checks from the repository root:

```sh
npm run showcase:test:e2e -- interaction/angular-contracts.spec.ts --project=angular-21-webkit --grep "dialog: immediate close cancels deferred jump focus" --retries=0 --repeat-each=10
npm run showcase:test:e2e -- interaction/angular-contracts.spec.ts --project="*-chromium" --project="*-firefox" --project="*-webkit" --grep "focused jump updates the tab stop|immediate close cancels deferred jump focus" --retries=0
```

## Visibility and Firefox scroll rounding

`e2e/helpers/picker.ts` compares day-button top and bottom edges relative to the scroll viewport, rounding each difference to the nearest whole CSS pixel. Firefox can apply a fractional scroll offset even when the picker requests an integer. Whole-pixel comparison accommodates this browser quantization while still excluding substantially clipped buttons. Round the differences rather than the absolute coordinates so classification does not depend on the picker's position on the page. Do not add browser-specific offsets or tune constants against screenshots.

On 2026-10-04, Playwright 1.63.0 / Firefox 155 applied `scrollTop = 49000.265625` after the picker requested `49000`. In the Finnish month-boundary fixture, the 49px first row began at `121.81666564941406`, above the viewport top of `122.08332824707031`; exact comparisons excluded all seven buttons. The same rounding reproduced in a standalone HTML scroller without Angular or picker styles, through both Juggler and standard WebDriver BiDi, at emulated DPR 1, 1.5 and 2. Chromium and WebKit applied `49000` exactly. The rounding rule resolves the test's overly precise containment expectation without changing the picker.

The month-boundary test retains raw geometry attachments on containment failures and checks annotation element bounds before screenshots. Those bounds describe CSS boxes; a text `Range` uses font metrics and can extend beyond them, so it is a different contract.

Focused geometry validation (screenshots excluded explicitly):

```sh
npm run showcase:test:e2e -- visual/month-boundaries.spec.ts --project="*-firefox" --project=angular-22-chromium --project=angular-22-webkit --retries=0 --ignore-snapshots
```

All 56 cases passed after the change, including the original 48 Firefox failures across Angular 11–22. Run without `--ignore-snapshots` to verify appearance too; the currently missing Firefox month-boundary baselines are tracked separately in [REGRESSIONS.md](../../docs/REGRESSIONS.md).
