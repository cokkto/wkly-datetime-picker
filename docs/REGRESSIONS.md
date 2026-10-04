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

## Reported Firefox context teardown failure

On 2026-10-04, `angular-16-firefox` was reported to fail in `interaction/angular-contracts.spec.ts:5`, `overlay: immediate close cancels deferred jump focus`, with:

```text
Error: browserContext.close: Protocol error (Browser.removeBrowserContext): can't access property "_maybeDontRestoreTabs", this._windows[aWindow.__SSi] is undefined
```

The failing operation is browser-context teardown. The installed Firefox 155 / Playwright 1.63.0 sources show that `Browser.removeBrowserContext` destroys the context, closes its page tabs, and can invoke `SessionStore.maybeDontRestoreTabs` when closing a window's last tab. That method accesses window state without checking whether it exists. This identifies the browser-side error path but does not establish what made that window state unavailable in the reported run.

The investigation has not reproduced the failure: 20 headless repetitions of the reported test passed with retries disabled; all 70 contracts across Angular 16 and 22 Firefox passed; and a standalone headless probe created and immediately closed 100 contexts with blank pages on one Firefox process without errors. No picker, test assertion, retry policy, or browser preference has been changed. The original command, launch mode (headless, headed, UI, or VS Code), and browser version remain needed to match the failing environment.

Headed checks in this execution environment stalled at the second `Jump value past` button's click, waiting for the element to be visible, enabled and stable. Two cases with two workers and one case with one worker reached the 30-second test timeout; both runs were then stopped. None reported the original session-store error. These headed click timeouts are a separate observation with an unconfirmed cause, so they do not validate or reproduce the reported teardown failure.

Focused reproduction command from the repository root:

```sh
npm run showcase:test:e2e -- interaction/angular-contracts.spec.ts --project=angular-16-firefox --grep "overlay: immediate close cancels deferred jump focus" --retries=0 --repeat-each=20
```

Add `--headed` to compare a visible browser run. For a subsequent failure, enable `DEBUG=pw:browser,pw:protocol` in the launching shell and retain the Firefox stderr/protocol output alongside the Playwright report; page traces alone may not explain browser-chrome teardown. Treat this as an unresolved reported harness issue until reproduction confirms its trigger.

## Verification rule

Record confirmed product failures with reproduction evidence and focused commands from the repository root; see the [developer guide](README.DEV.md). Run focused checks with `--retries=0` while investigating. Screenshot baselines record appearance and can include a defect; geometry assertions are the correctness gate. Check other Angular majors and browser profiles after a fix. Remove resolved entries and update the [development plan](DEVELOPMENT-PLAN.md).

The focused-jump `attr.tabindex` NG0100 regression was resolved on 2026-10-04. It reproduced in 3 of 10 Angular 21 WebKit runs before the fix; all 344 browser checks after the fix passed with retries disabled. The [test README](../projects/wkly-datetime-picker.tests/README.md#focused-jumps-and-deferred-focus) retains the cause, synchronous reproduction evidence, and focused commands.

The two Chromium local testbed `ERR_NO_BUFFER_SPACE` failures are mitigated by the local Node HTTP relay added on 2026-10-04. Saved traces confirm that Angular 14's document and Angular 11 mobile's application bundle failed at the network layer. All 449 six-worker checks passed without retries, including the complete affected profiles, focused repetitions, and smoke coverage across all 72 Angular/browser profiles. The [test README](../projects/wkly-datetime-picker.tests/README.md#chromium-local-testbed-transport) retains the evidence, deterministic browser-offline regression test, and transport limitations. The underlying Windows resource condition remains unconfirmed.
