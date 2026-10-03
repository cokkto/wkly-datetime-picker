# Regression log

The open entries are confirmed product failures. Their focused assertions remain enabled. Reproduce from the repository root with dependencies and Playwright browsers installed; see [developer guide](README.DEV.md).

On 2026-10-03, focused Angular 22 checks confirmed day overflow at 360px and incomplete weeks at zoom 0.8 and 1.5. The earlier month-label failure was a test false positive, recorded below.

## Open regressions

### M02-LAYOUT-01 — Day columns overflow

At narrow widths and CSS zoom, rightmost day buttons extend beyond the week scroller and become clipped. Expected: all seven day columns stay inside the viewport and align equally. Reproduced on the minimal `/cases/empty/virtual-weeks` fixture in Chromium, Firefox, WebKit, Edge, Chromium DPR 1.5, and mobile Chromium with Angular 22.

Source: `projects/wkly-datetime-picker.tests/e2e/visual/week-layout.spec.ts`. Focused check:

```sh
npm run showcase:test:e2e -- --project=angular-22-chromium --grep "week geometry viewport 360 CSS zoom 1$" --retries=0
```

### M02-LAYOUT-02 — Fractional zoom clips weeks

The Four weeks preset does not show four complete rows at some CSS zoom levels; boundary rows are partially clipped. Expected: the requested number of complete rows fits. Reproduced across the six browser profiles on the Angular 22 minimal fixture.

Source: `projects/wkly-datetime-picker.tests/e2e/visual/week-boundaries.spec.ts`. Focused check:

```sh
npm run showcase:test:e2e -- --project=angular-22-firefox --grep "four complete weeks" --retries=0
```

The picker measures row height in `ngAfterViewInit` using `getBoundingClientRect()`. Check the coordinate calculation before changing geometry; this is an investigation lead, not a confirmed cause.

## Verification rule

Run focused checks with `--retries=0` while investigating. Screenshot baselines record appearance and can include a defect; geometry assertions are the correctness gate. Check other Angular majors and browser profiles after a fix. Update this log and the [development plan](DEVELOPMENT-PLAN.md) when a regression is resolved or a new one is confirmed.

## Closed investigation

### M02-LAYOUT-03 — Month labels overlap (test false positive)

Month annotations in the same week intentionally use alternating vertical positions. At narrow widths, the November and December 2099 labels share horizontal space but remain staggered and readable. The original browser assertion compared only horizontal text bounds, so it reported the intended layout as a failure. It failed at 360px and 768px in a focused Angular 22 Chromium rerun on 2026-10-03.

The assertion now permits horizontal overlap when the labels differ vertically by at least half a text line box. No picker UI code changed. All 18 focused checks passed with retries disabled at 360px, 768px, and 1440px across Chromium, Firefox, WebKit, Edge, Chromium DPR 1.5, and mobile Chromium on Angular 22.

Source: `projects/wkly-datetime-picker.tests/e2e/visual/week-boundaries.spec.ts`. Focused check:

```sh
npm run showcase:test:e2e -- --project=angular-22-webkit --grep "month boundary annotations" --retries=0
```
