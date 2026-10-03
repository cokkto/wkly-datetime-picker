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

`e2e/interaction/angular-contracts.spec.ts` uses the versioned `/contracts` fixture to exercise public jump methods on inline, native-dialog, and CDK-overlay pickers, Gregorian and Hebrew adapter boundaries, scoped configuration/localization providers, runtime input changes, and accessible range endpoint edits. `contracts/localization.ts` checks exact regional/script/language fallback against source and installed shared packages.
