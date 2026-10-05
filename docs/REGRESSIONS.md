# Open regressions

## Calendar title interaction

The month/year title in the calendar toolbar opens manual mode. In manual mode, clicking the same title keeps manual mode open. The requested behavior is to make the title non-interactive in both views. This remains a UI behavior issue; the separate view-toggle button already switches between calendar and manual entry.

Relevant source: [picker.component.html](../projects/wkly-datetime-picker.22/src/picker.component.html) (`year-control`) and [picker.component.ts](../projects/wkly-datetime-picker.22/src/picker.component.ts) (`toggleView`), with matching implementations across Angular integrations.

## Recording and verifying issues

Record confirmed failures with reproduction evidence and focused commands from the repository root; see the [developer guide](README.DEV.md). Investigate with retries disabled. Screenshot baselines record appearance; geometry assertions check correctness. Check affected Angular versions and browsers after a fix, remove resolved entries and update the [development plan](DEVELOPMENT-PLAN.md).
