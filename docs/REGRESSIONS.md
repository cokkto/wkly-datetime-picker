# Open regressions

These are the currently confirmed product failures. The focused assertions remain enabled. Reproduce from the repository root with dependencies and Playwright browsers installed; see [developer guide](README.DEV.md).

On 2026-10-03, the focused Angular 22 Chromium check ran eight cases with retries disabled: four passed and four failed. The failures covered day overflow at 360px and zoom 1, complete-week count at zoom 0.8 and 1.5, and month-label overlap at 768px.

## M02-LAYOUT-01 — Day columns overflow

At narrow widths and CSS zoom, rightmost day buttons extend beyond the week scroller and become clipped. Expected: all seven day columns stay inside the viewport and align equally. Reproduced on the minimal `/cases/empty/virtual-weeks` fixture in Chromium, Firefox, WebKit, Edge, Chromium DPR 1.5, and mobile Chromium with Angular 22.

Source: `projects/wkly-datetime-picker.tests/e2e/visual/week-layout.spec.ts`. Focused check:

```sh
npm run showcase:test:e2e -- --project=angular-22-chromium --grep "week geometry viewport 360 CSS zoom 1$" --retries=0
```

## M02-LAYOUT-02 — Fractional zoom clips weeks

The Four weeks preset does not show four complete rows at some CSS zoom levels; boundary rows are partially clipped. Expected: the requested number of complete rows fits. Reproduced across the six browser profiles on the Angular 22 minimal fixture.

Source: `projects/wkly-datetime-picker.tests/e2e/visual/week-boundaries.spec.ts`. Focused check:

```sh
npm run showcase:test:e2e -- --project=angular-22-firefox --grep "four complete weeks" --retries=0
```

The picker measures row height in `ngAfterViewInit` using `getBoundingClientRect()`. Check the coordinate calculation before changing geometry; this is an investigation lead, not a confirmed cause.

## M02-LAYOUT-03 — Month labels overlap

November and December labels can overlap at narrow width when both annotate the same week. Expected: annotations remain separate and readable. Reproduced across the six browser profiles on the Angular 22 minimal fixture.

Source: `projects/wkly-datetime-picker.tests/e2e/visual/week-boundaries.spec.ts`. Focused check:

```sh
npm run showcase:test:e2e -- --project=angular-22-webkit --grep "month boundary annotations" --retries=0
```

## Verification rule

Run focused checks with `--retries=0` while investigating. Screenshot baselines record appearance and can include a defect; geometry assertions are the correctness gate. Check other Angular majors and browser profiles after a fix. Update this log and the [development plan](DEVELOPMENT-PLAN.md) when a regression is resolved or a new one is confirmed.
