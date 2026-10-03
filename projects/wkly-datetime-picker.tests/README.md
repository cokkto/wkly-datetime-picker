# Milestone 02 regression project

This private project owns regression tests, fixtures and visual baselines. It is not a publishable package. Run commands from the repository root; dependencies and browser binaries come from the workspace.

The project is registered in the pnpm workspace. It also supports `npm --prefix projects/wkly-datetime-picker.tests test` and `npm --prefix projects/wkly-datetime-picker.tests run test:e2e -- --project=firefox`.

| Command | Coverage |
| --- | --- |
| `npm test` | All source contracts in UTC and America/New_York; continues after assertion failures |
| `npm run test:installed` | New domain contracts against freshly built, packed and installed shared packages, in both timezones |
| `npm run showcase:test:e2e -- --retries=0` | Active browser suite, all configured projects |
| `npm run showcase:test:e2e -- --project=firefox` | One browser, including runtime bridge checks for Angular 11–22 |
| `npm run showcase:test:e2e -- --grep "week geometry"` | Responsive geometry and overflow checks |
| `npm run showcase:test:e2e -- --grep "rendered weeks"` | Screenshot comparisons |
| `npm run showcase:test:e2e:update -- --grep "rendered weeks"` | Deliberate baseline generation; review images before committing |
| `npm run ci:test` / `npm run lint:test` / `npm run lint` | Compatibility planning and lint tooling checks |

## Organization

- `contracts.ts`: pre-existing core, adapter, Hebrew exhaustive interval and presentation contracts, preserved.
- `contracts/`: exact validation results, callback contracts, ISO boundaries, week row generation.
- `helpers/`: shared non-fail-fast assertion harness.
- `e2e/helpers/`: iframe-aware runtime test bed and visible-day queries.
- `e2e/interaction/`: selection, keyboard, mouse, touch dragging, scrolling, manual drafts and ARIA.
- `e2e/visual/`: geometry invariants and screenshot comparisons.
- `e2e/runtime-bridge.spec.ts`: existing integration checks across Angular 11–22.
- Other top-level `e2e/*.spec.ts` and the original named Chromium baselines are retained historical pre-iframe tests. They were already excluded by the old config. They are not counted as executed coverage; port remaining scenarios before enabling them.
- `tests/compatibility/` at repository root remains the generated packed Angular consumer/SSR test infrastructure.

## Matrix and interpretation

Chromium, Firefox, WebKit, Microsoft Edge (`channel: msedge`), Chromium at DPR 1.5, and touch-enabled mobile Chromium run the active suite. Edge uses the installed branded browser; it shares Chromium's engine. Install Playwright engines with `npm run showcase:browsers`; install Edge separately if unavailable. Missing browsers are environment failures, not component regressions.

Geometry cases combine widths 360/768/1440, CSS zoom 0.8/1/1.25/1.5 and component size multiplier 1.15. They check full rows before and after week navigation, horizontal containment, equal day alignment, and selection after resizing. Device scale factor exercises rasterization independently. CSS zoom is **not** browser toolbar zoom or OS display scaling; those remain manual coverage gaps. Mobile context retains its mobile viewport semantics even when a case changes viewport dimensions.

Screenshot baselines describe the observed initial implementation, including known defects. Geometry assertions remain the correctness gate and must not be weakened to accept a clipped baseline. Baselines are platform-sensitive; this milestone records Windows images. Review changes on the same OS/browser versions before accepting new baselines.

Playwright writes HTML and JSON reports, screenshots, traces and videos to ignored `playwright-report/` and `test-results/`. Read [REGRESSIONS.md](REGRESSIONS.md) for grouped failures and reproduction commands. Do not mark product failures skipped or expected-failing: future fixes should turn their assertions green.

The test project's `tsconfig.json` supports a modern TypeScript toolchain. With the Angular 22 compatibility toolchain prepared, check it with `node .compat/22/node_modules/typescript/bin/tsc -p projects/wkly-datetime-picker.tests/tsconfig.json --ignoreDeprecations 6.0`. Legacy Angular library builds exclude this private test project.

For a deliberately shared development server, set `WKLY_E2E_REUSE_SERVER=1`; the default run owns its server. The test server must have been built with `WKLY_E2E=1`, which fixes the demo's clock. CI uses prebuilt showcase assets.
