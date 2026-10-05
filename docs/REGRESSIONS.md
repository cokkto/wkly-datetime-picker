# Open regressions

## Calendar title interaction

The month/year title in the calendar toolbar opens manual mode. In manual mode, clicking the same title keeps manual mode open. The requested behavior is to make the title non-interactive in both views. This remains a UI behavior issue; the separate view-toggle button already switches between calendar and manual entry.

Relevant source: [picker.component.html](../projects/wkly-datetime-picker.22/src/picker.component.html) (`year-control`) and [picker.component.ts](../projects/wkly-datetime-picker.22/src/picker.component.ts) (`toggleView`), with matching implementations across Angular integrations.

## Angular 22 toolchain install resolution

On 2026-10-05, [Actions run 37296429197](https://github.com/cokkto/wkly-datetime-picker/actions/runs/37296429197/job/111718670685) failed strict `npm install` for Angular 22 with `ERESOLVE` naming `@angular/build@22.2.1` and `@vitejs/plugin-basic-ssl@2.3.0`; the other eleven packed jobs passed. The previous run installed the same direct dependencies with the same Node 24.15.0/npm 11.12.1 successfully. Packing and consumer tests were not reached.

Fresh local resolution of Angular 22's `supported-angular.json` dependencies with `npm install --package-lock-only --ignore-scripts --strict-peer-deps --audit=false --fund=false` reproduced the same error. The previous successful artifact's toolchain lockfile passed `npm ci --dry-run --ignore-scripts --strict-peer-deps` with the same dependencies. `scripts/compatibility.cjs` currently regenerates the workspace without retaining a lockfile, so each run resolves transitive dependencies afresh. Retaining reviewed toolchain lockfiles and using `npm ci` is a candidate fix; the precise resolver/transitive-dependency cause and a full locked install still need verification.

## Recording and verifying issues

Record confirmed failures with reproduction evidence and focused commands from the repository root; see the [developer guide](README.DEV.md). Investigate with retries disabled. Screenshot baselines record appearance; geometry assertions check correctness. Check affected Angular versions and browsers after a fix, remove resolved entries and update the [development plan](DEVELOPMENT-PLAN.md).
