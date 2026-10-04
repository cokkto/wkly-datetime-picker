# Open regressions

## Click on Month button inconsistent
- Click on month button on top of calendar navigates to manual mode
- Clicking on month button on top of calendar in manual mode doesn't navigate to calendar view

### Expected:
Make Month non-interactive in both views

// No confirmed regressions are currently open.

## Firefox month-boundary screenshot baselines

The four Firefox baselines for `visual/month-boundaries.spec.ts` are absent: Finnish LTR and Hijri RTL at widths 360 and 768. The original 48 Firefox failures were caused by overly precise day-containment comparisons; that test issue is resolved with whole-CSS-pixel comparisons, with [evidence and the rounding rule](../projects/wkly-datetime-picker.tests/README.md#visibility-and-firefox-scroll-rounding). All 56 focused geometry cases now pass across Angular 11–22 Firefox and Angular 22 Chromium/WebKit. Screenshot coverage still needs initial Firefox baselines to be created and reviewed separately.

The full Angular 22 Chromium/Firefox/WebKit rerun on 2026-10-04 completed with 377 passed, 9 skipped touch-only cases, and 4 failures. Each failure reports `A snapshot doesn't exist` for one of these Firefox baselines; all geometry and interaction assertions passed. The run used `--retries=0 --update-snapshots=none`, leaving baselines unchanged. Full lint and repository formatting passed.

Reproduce with screenshots enabled and baseline writes disabled:

```sh
npm run showcase:test:e2e -- --project=angular-22-firefox visual/month-boundaries.spec.ts --retries=0 --update-snapshots=none
```

## Verification rule

Record confirmed product failures with reproduction evidence and focused commands from the repository root; see the [developer guide](README.DEV.md). Run focused checks with `--retries=0` while investigating. Screenshot baselines record appearance and can include a defect; geometry assertions are the correctness gate. Check other Angular majors and browser profiles after a fix. Remove resolved entries and update the [development plan](DEVELOPMENT-PLAN.md).
