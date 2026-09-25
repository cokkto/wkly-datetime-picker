# WKLY 1.0.0 publication review — revision 01

**Decision: do not publish 1.0.0 yet.** This branch is the Angular 11 build for the intended Angular 11–15 release line. Later Angular release lines are independent work and do not block 1.0.0 on this branch. The local checks pass, but the current peer range overstates this branch's support and the tests exercise workspace builds rather than packages installed from npm tarballs. The remaining gates below address those concrete risks and specific gaps in documented behavior.

## Evidence reviewed

- `npm run build`, `npm test` (12 contract groups), `node scripts/ssr-check.cjs`, `npm run showcase:build`, and `npm run pack:check` passed locally on Node 24. The pack check found 7 files each in core and adapters and 51 in the Angular package, with no forbidden showcase files or dependencies. This is evidence for the build and package boundary, not for installed consumer compatibility.
- `npm run showcase:test:e2e -- --project=chromium` passed: 36 tests, 6 intentionally skipped. The full suite passed with 138 tests and 30 project-specific skips across Chromium, Firefox, WebKit, and mobile Chromium.
- The existing tests already exercise all six modes, inline/dialog/CDK presentations, reverse selection, invalid drafts, scrolling, mobile touch, RTL, forms, SSR, and visual baselines. Repeating those tests or imposing an arbitrary coverage percentage is not a release milestone.

## Milestone 1 — Document the Angular release-line model (complete; non-blocking)

[`projects/wkly-datetime-picker/tsconfig.lib.json`](projects/wkly-datetime-picker/tsconfig.lib.json) sets `enableIvy: false`, and the built Angular package contains View Engine metadata. Angular removed the compatibility compiler for View Engine libraries in v16. This explains the boundary between this branch and the future partial-Ivy lines; it does not require those future lines to be built before this branch's 1.0.0. See the [Angular update guide](https://github.com/angular/angular-update-guide/blob/main/src/app/recommendations.ts) (v16 ngcc step) and [Angular library publishing guide](https://angular.dev/tools/libraries/creating-libraries).

- [x] Identify this branch as the Angular 11 build and define the intended `1.x` consumer range as Angular 11–15 in [`README.md`](README.md) and the local [`requirements.rev01.md`](requirements.rev01.md). The latter is excluded by `.gitignore`; the tracked README and this review carry the versioned policy.
- [x] Document planned, independent `2.x` (Angular 16–18), `3.x` (Angular 19), and `4.x` (Angular 20 onward) release lines. Each future line needs its own packaging and consumer verification. Their completion is not a gate for `1.0.0` here.

**Remaining release action:** [`projects/wkly-datetime-picker/package.json`](projects/wkly-datetime-picker/package.json) still advertises Angular `>=11`, which includes unsupported v16+ for this View Engine build. Milestone 5 narrows the published peer range after Milestone 2 verifies the intended 11–15 consumer matrix. This metadata correction is a publication gate; building the newer lines is not.

## Milestone 2 — Test the artifacts npm users will install

**Confirmed gap.** [`tsconfig.json`](tsconfig.json) maps package names to `projects/*/src/public-api.ts`, so the showcase's browser tests compile workspace source. [`scripts/pack.cjs`](scripts/pack.cjs) runs `npm pack --dry-run` and checks exclusions; it does not install or execute the resulting tarballs. [`scripts/ssr-check.cjs`](scripts/ssr-check.cjs) loads local `dist` directories. No current gate verifies a clean consumer using the actual packed manifests, declarations, module paths, and dependency graph.

- [ ] Add a CI smoke consumer that creates tarballs for all three packages, installs those tarballs in dependency order in a separate project without workspace path mappings or junctions, and imports only public entry points.
- [ ] In that consumer, compile a small Angular form with the inline picker and native dialog; compile the optional CDK overlay with the matching CDK major. Verify the base entry point when CDK is absent. Exercise core/adapters JavaScript and declaration imports from the installed packages.
- [ ] Run this gate against Angular 11, 12, 13, 14, and 15 for this `1.x` line, using an appropriate Node/TypeScript toolchain for each consumer. Keep `pack:check` as the package-content gate.

**Done when:** the exact tarballs intended for publication install, type-check, build, and run in clean consumers across the advertised versions.

## Milestone 3 — Close the specific contract-test gaps

**Confirmed gap.** [`tests/contracts.ts`](tests/contracts.ts) contains 12 broad groups, but several public validation branches are absent. In particular, the test named `disabled endpoints, crossing and custom range validators` never supplies `rangeValidator`; no test supplies `validators`. Bounds are tested through one invalid `min > max` case, not inclusive equality or each rejection direction. The Gregorian conversion loop samples every 31st day and its endpoints, but does not explicitly assert year `0000`/`9999` ISO round-trips or rejection just beyond them. Browser tests fix the timezone to UTC, and there is no second host-timezone run. These are documented contracts in [`docs/API.md`](docs/API.md) and [`requirements.rev01.md`](requirements.rev01.md), not speculative features.

- [ ] Add focused assertions for `rangeValidator` and `validators`: accepted and rejected results, correct range mode and ordered endpoints, and error propagation. Include empty and invalid input cases where the public callback contract says they apply; fix code if those tests reveal a mismatch.
- [ ] Add a table of canonical value and constraint cases for all six modes: equal endpoints, both bound directions and inclusive equality, hidden seconds/date fields, time-only sentinel, step mismatch, disabled time endpoint, and crossing allowed versus rejected. Assert the public error code and endpoint, not just a nonempty error array.
- [ ] Add exact Gregorian year `0000` and `9999` serialization/conversion boundaries, unsupported neighbors, and a UTC value test under at least one non-UTC host timezone. Keep the existing exhaustive Hebrew interval test.

**Done when:** these branches have assertions that would fail for an incorrect returned value or error, and the tests pass against both source and the packed package where applicable.

## Milestone 4 — Cover the remaining public Angular integration paths

**Confirmed gap.** The Playwright suite tests user interaction thoroughly but does not call `scrollToAbsoluteWeek`, `scrollToCalendarDate`, or `scrollToValue`, or assert provider precedence for `WKLY_CONFIG`/`WKLY_LOCALIZATION`. The existing ARIA checks cover isolated states (for example, `aria-disabled`) rather than the complete selected/current/disabled state through a selection change. These APIs and states are documented in [`docs/API.md`](docs/API.md) and the accessibility requirements.

- [ ] Add a small host-driven integration test for each public jump method on the inline component and a transient trigger, asserting the visible week, focus, and optional selection. Include a date before 1970 and one near the adapter boundary.
- [ ] Add tests for configuration provider versus per-instance input precedence and localization fallback. Assert that runtime input changes preserve or update focus and validation as documented.
- [ ] Extend one existing browser interaction test to assert calendar grid, row/column, selected, current-day, disabled, and accessible-name states before and after selection, including a range endpoint. Keep this tied to behavior rather than screenshots alone.

**Done when:** the exported integration methods and required accessibility states have observable automated assertions in the supported browser suite.

## Milestone 5 — Cut and verify the 1.0.0 release

- [ ] After the required tests pass, narrow the Angular and optional CDK peer ranges for this View Engine line to the verified 11–15 majors, and update the three publishable package versions and their internal dependency ranges together from `0.1.0` to `1.0.0`. Update the root lockfile and any versioned documentation.
- [ ] Rebuild from a clean install, run the complete CI gate and the tarball consumer gate, inspect all three tarball manifests, then publish in dependency order: core, adapters, Angular package.

**Done when:** the published artifact is the tested artifact, all three packages resolve to the intended 1.0.0 versions, and the support claims reflect verified consumers.
