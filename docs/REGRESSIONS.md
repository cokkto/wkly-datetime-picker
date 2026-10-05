# Open regressions

## Calendar title interaction

The month/year title in the calendar toolbar opens manual mode. In manual mode, clicking the same title keeps manual mode open. The requested behavior is to make the title non-interactive in both views. This remains a UI behavior issue; the separate view-toggle button already switches between calendar and manual entry.

Relevant source: [picker.component.html](../projects/wkly-datetime-picker.22/src/picker.component.html) (`year-control`) and [picker.component.ts](../projects/wkly-datetime-picker.22/src/picker.component.ts) (`toggleView`), with matching implementations across Angular integrations.

## Resolved — picker host reuse timeouts

On 2026-10-05, the server on port 4318 returned 200 for `/health`, `/11/index.html` and `/22/index.html`, but 404 for `/12/index.html` and `/13/index.html`. Saved failure contexts reported `Test timeout of 30000ms exceeded while setting up "host"` across unrelated values, editing, layout and calendar scenarios. The server retained the Angular selection from its original run; Playwright reused it based solely on `/health`, and each missing page waited for a host bridge that could never boot.

The server now routes every registered version whose built files exist, including versions built after it started. Picker fixtures use `http://vN.wkly.localhost:4318/index.html`, matching the showcase's versioned hostnames. Global setup checks every selected virtual host over loopback before workers start, and fixture navigation reports HTTP failures directly. Node does not resolve these `.localhost` names in the current environment, so startup sends the versioned Host header while connecting to `127.0.0.1`. An already-running server using the old code must be stopped once, or bypassed with `WKLY_TEST_PORT` set to an unused port.

Focused regression check: `node --test scripts/test-host-server.test.cjs`. It verifies a healthy server with missing hosts fails startup, a newly built version becomes accessible without restarting, and an unrelated healthy server is rejected.

Validation: the existing partial server was rejected in 0.53 seconds before any workers started. With `WKLY_TEST_PREBUILT=1`, `WKLY_TEST_PORT=4319`, `WKLY_TEST_ANGULAR=12,13,22` and `WKLY_TEST_BROWSERS=chromium,firefox,webkit`, `node scripts/playwright.cjs test values-forms selection-editing layout --reporter=list --output=.test-build/timeout-fix/artifacts` passed all 432 scenarios in 3.2 minutes. `npm run test:tooling` passed 12 checks; lint and test typechecking also passed. The full Angular matrix was not rerun for this tooling fix.

After adopting subdomains, `npm test` with `WKLY_TEST_PORT=4319`, Angular 22 and Chromium passed source contracts and all 123 picker scenarios, including the context/page reuse audit. With all registered versions and engines selected, `node scripts/playwright.cjs test values-forms --grep 'date UTC writes, inclusive bounds, validation and recovery$' --reporter=list --output=.test-build/subdomain-routing/artifacts` passed 36 scenarios in 38.3 seconds, verifying browser startup through each versioned hostname. Tooling, lint and typechecking also passed. This checks the complete startup matrix, rather than the complete behavior matrix.

## Recording and verifying issues

Record confirmed failures with reproduction evidence and focused commands from the repository root; see the [developer guide](README.DEV.md). Investigate with retries disabled. Screenshot baselines record appearance; geometry assertions check correctness. Check affected Angular versions and browsers after a fix, remove resolved entries and update the [development plan](DEVELOPMENT-PLAN.md).
