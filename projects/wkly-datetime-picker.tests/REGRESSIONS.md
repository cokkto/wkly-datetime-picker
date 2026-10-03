# Milestone 02 regression log

No production fixes are included. Failing correctness assertions stay enabled. Recorded on 2026-10-03: Windows, Node 24.15.0, Playwright 1.63.0, UTC browser timezone, reduced motion, Angular 22 for the new interaction/layout tests; the existing bridge suite additionally covers Angular 11–22. Actual engines: Chromium 153.0.8010.12, installed Edge 154.0.4258.37, Firefox 155.0, WebKit 26.6.

## M02-LAYOUT-01 — Day columns extend beyond the week viewport

- **Type:** visual / responsive / interaction risk.
- **Environment:** reproduced in all six browser projects: Chromium, Edge, Firefox, WebKit, Chromium DPR 1.5 and mobile Chromium.
- **Viewport/scale:** 360×1000 at CSS zoom 1/1.25/1.5; 768×1000 and 1440×1000 at 1.25/1.5. Firefox also fails at 360×1000 / 0.8. Component size multiplier 1.15. Other combinations remain in the suite as controls. Total: 43 failing project/case combinations.
- **Scenario:** open `/virtualization`, choose Angular 22, inspect Four weeks; apply scale and navigate one week.
- **Expected:** all seven day columns remain within the horizontal clipping region and have aligned, equal-width cells.
- **Actual:** rightmost day buttons extend beyond the week scroller and become clipped. Multiple rows produce the same assertion; they are one defect group.
- **Reproducer:** `e2e/visual/week-layout.spec.ts`, `npm run showcase:test:e2e -- --project=chromium --grep "week geometry viewport 360 CSS zoom 1$"`.
- **Relationship:** likely related to M02-LAYOUT-02 through size/zoom measurements, but no root cause is claimed without implementation investigation.

## M02-LAYOUT-02 — Fractional scale clips complete weeks vertically

- **Type:** visual / scrolling / scale.
- **Environment:** reproduced in all six browser projects.
- **Viewport/scale:** 1440×1000, zoom 0.8/1/1.25/1.5, component multiplier 1.15.
- **Scenario:** Four weeks preset immediately after scaling.
- **Expected:** four complete week rows fit in the viewport, including boundary rows.
- **Actual:** zoom 0.8 produces two complete rows; zoom 1.5 produces five, instead of four. Boundary rows are partially clipped. Zoom 1 and 1.25 pass the complete-row count. Total: 12 failing project/case combinations.
- **Reproducer:** `e2e/visual/week-boundaries.spec.ts`, `--grep "four complete weeks"`.
- **Relationship:** separate vertical symptom from M02-LAYOUT-01; keep both tests even if one future fix addresses both. Investigation lead only: `ngAfterViewInit` measures transformed row height with `getBoundingClientRect()` and feeds it into scroll/CSS coordinates. No implementation change or confirmed root cause is claimed.

## M02-LAYOUT-03 — Month labels overlap at a week boundary

- **Type:** visual / responsive.
- **Environment:** reproduced in all six browser projects.
- **Viewport/scale:** 360×1000, CSS zoom 1, component multiplier 1.15; 768 and 1440 are controls.
- **Scenario:** initial December 2099 viewport includes November and December labels in the same week.
- **Expected:** visible month annotation text must not overlap adjacent month text.
- **Actual:** November 2099 and December 2099 overlap at narrow width. Wider controls pass. Total: six failing project/case combinations.
- **Reproducer:** `e2e/visual/week-boundaries.spec.ts`, `--grep "month boundary annotations"`.
- **Relationship:** shares narrow-width pressure with M02-LAYOUT-01 but concerns annotation text rather than day-button containment.

## M02-OBS-01 — Intermittent WebKit reset leaves a null value

- **Status:** observed once in the full bridge run; **not reproduced in five isolated reruns**. Do not treat it as a confirmed deterministic defect or erase the observation because reruns passed.
- **Type:** functional / interaction / possible cross-browser timing issue.
- **Environment:** Angular 12, WebKit 26.6, Desktop Safari profile, viewport 1280×720, DPR 2, default zoom/scale.
- **Scenario:** `/single`, select Angular 12, configure the datetime example as date-only, then click Reset example.
- **Expected:** the original `2099-12-16T13:00:00.000Z` value returns.
- **Actual:** host value remains `null` throughout the seven-second assertion timeout.
- **Spec:** `e2e/runtime-bridge.spec.ts`, `Angular 12 showcase › evergreen showcase configures the isolated Angular calendar`, reset assertion at line 80.
- **Recheck:** `npm run showcase:test:e2e -- --project=webkit --grep "Angular 12 showcase.*evergreen showcase" --repeat-each=5 --workers=1 --retries=0` — five passes.
- **Relationship:** no established connection to the three layout failures. Assertion remains enabled and unchanged; investigate runtime/host message timing if it recurs. The original trace and error context are preserved locally in ignored `.test-build/milestone-02-evidence/`.

## Test corrections and coverage limits

- **Environment observation:** the full run's mobile Angular 16 localization bridge case timed out at runtime selection after Chromium reported `Failed to load resource: net::ERR_NO_BUFFER_SPACE`. All five isolated reruns passed: `--project=mobile --grep "Angular 16 showcase.*showcase sends translations" --repeat-each=5 --workers=1 --retries=0`. This is recorded as a resource-loading/environment failure, not a confirmed component defect. Original evidence is preserved alongside the WebKit trace.
- The first ARIA check incorrectly expected seven accessible cells in a deliberately month-clipped boundary row. It now uses a complete interior row; six browser projects passed the corrected check. These original failures are test errors, not product bugs.
- A callback fixture omitted its required calendar ID; corrected and verified from source and installed packages.
- Screenshot checks reveal and capture the host iframe. WebKit suspends animation frames in offscreen iframes; revealing the host resolves the original capture timeout. Capturing outside the zoomed document also avoids zoom-dependent locator crop coordinates.
- Browser toolbar zoom and OS display scaling have not been automated. CSS zoom, component scale and DPR are distinct, explicitly labeled axes.
- Historical pre-iframe suites remain preserved but excluded, as before this milestone. New active suites port representative interactions, not every old scenario.
- The full Angular packed-consumer/AOT/SSR toolchain matrix is not rerun by the shared-package installed-contract command. Existing compatibility CI remains responsible for that matrix.

## Execution results

The finalized new interaction/visual suite ran with retries disabled: **128 passed, 61 failed, 15 skipped**, 204 cases. All failures belong to the three visual groups above. The 15 skips are touch-only cases on five non-touch projects; no product failure is skipped or marked expected-failing.

| Project | Passed | Failed | Touch-only skipped |
| --- | ---: | ---: | ---: |
| Chromium | 21 | 10 | 3 |
| Edge | 21 | 10 | 3 |
| Chromium DPR 1.5 | 21 | 10 | 3 |
| Firefox | 20 | 11 | 3 |
| WebKit | 21 | 10 | 3 |
| Mobile Chromium | 24 | 10 | 0 |

- `npm test`: **224 passed**, 112 contract groups in each of UTC and America/New_York. Includes the unchanged exhaustive Hebrew interval check.
- `npm run test:installed`: **196 passed**, 98 new domain groups per timezone, resolving freshly packed shared packages from an isolated installed consumer.
- Final screenshot baseline comparison: **18 passed** across six projects, without update mode. These are current-state baselines, not assertions that the current geometry is correct.
- `npm run ci:test`: **3 passed**; `npm run lint:test`: **2 passed**.
- `npm run lint`: **203 files, zero errors**. Test-project TypeScript check: passed. `npm run format`: completed.

The existing bridge matrix also completed: **502 passed, one WebKit reset assertion failed, one mobile resource-loading timeout**, across 504 Angular 11–22/browser combinations. Each exceptional case subsequently passed five isolated reruns; both observations remain recorded above.

The initial complete browser run had 636 cases: **574 passed, 47 failed, 15 skipped**. Its failures included two instances of the subsequently corrected ARIA test fixture. The finalized 204-case interaction/visual run replaces those initial test results, adds the boundary and screenshot suites, and retains all 61 reproducible visual failures. Screenshot capture setup was then finalized and all 18 ordinary comparisons passed again. Taken together, the final suites cover **708 distinct cases**: 630 passes, 61 confirmed visual failures, one intermittent reset failure, one environment timeout, and 15 touch-only skips. Isolated diagnostic reruns are not counted as extra coverage or used to hide the original observations.

New-suite reproduction: `npm run showcase:test:e2e -- --grep-invert "Angular [0-9]+ showcase" --retries=0`. Full-suite command: `npm run showcase:test:e2e -- --retries=0`. The latter discovers all 708 cases in seven active browser spec files. Local run JSON and exceptional traces are retained under `.test-build/milestone-02-evidence/`; transient logs are under `.test-build/logs/`.
