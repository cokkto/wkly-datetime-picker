# WKLY npm package publication review — revision 01

**Status: preparation in progress; do not publish yet.** The package model has changed since the original review. Three shared packages (`wkly-datetime-picker.core`, `.adapters`, and `wkly-datetime-picker`) are at `0.1.0`; twelve Angular integration packages (`wkly-datetime-picker.11` through `.22`) are at `N.0.0`. Each numbered package targets its matching Angular major. There is no single Angular `1.0.0` release line or Angular 11–15 peer range to cut. Publication still needs verified installed artifacts, focused contract coverage, and a release procedure for this package graph.

## Current evidence and limits

- [`supported-angular.json`](supported-angular.json) registers Angular 11–22 with pinned Node, Angular, TypeScript, CLI, and CDK toolchains. Each numbered package declares a matching Angular and optional CDK peer range. The shared packages have no Angular dependency.
- [Compatibility CI](.github/workflows/compatibility.yml) builds each registered major, packs the shared and matching Angular packages, installs their tarballs in a generated consumer, AOT compiles public imports, runs SSR, and exercises a browser contract. The showcase job separately runs lint and Chromium interaction tests. The planner includes every registered major on each CI run.
- The consumer previously installed CDK unconditionally and only checked that secondary entry points exported symbols. The current change compiles inline and native-dialog use without CDK, then installs the matching CDK and compiles and opens an overlay trigger. Local Angular 11 and 22 tarball builds, SSR checks, and all three Chromium contracts pass. The other majors and CI still need verification. `pack:check` verifies tarball contents and dependency boundaries; it does not substitute for consumer installation.
- [`tests/contracts.ts`](tests/contracts.ts) still has broad validation tests without direct `rangeValidator` or `validators` assertions, exact ISO year-boundary checks, or a non-UTC host run. The browser suite still lacks direct jump-method, provider-precedence, and complete ARIA state assertions.

## Milestone 1 — Verify the packed consumer matrix (in progress)

- [ ] Run the revised two-stage consumer gate for every registered major (11–22) with its pinned Node version. Confirm that the base tarballs install and AOT compile inline and native-dialog use without CDK, and that the matching CDK makes the secondary overlay entry point compile and run. Retain the installed-package SSR and browser checks.
- [ ] Check the generated consumer lockfiles and all tarball manifests for dependency resolution to the packed shared versions, absent workspace paths, public declaration/module paths, package files, and optional CDK behavior. Pack in dependency order: core, adapters, presentation, then the numbered Angular package; install all four local tarballs as one dependency graph.
- [ ] Record a green full compatibility result after these checks; fix any per-major failure before claiming the matrix is verified.

**Exit:** the packages intended for publication install, type-check, build, and run from tarballs in isolated consumers for all advertised Angular majors, both with and without optional CDK.

## Milestone 2 — Fill specific value-contract gaps

- [ ] Assert accepted, rejected, and thrown results for `rangeValidator` and `validators`, including the callback arguments, ordered range endpoints, empty values, and invalid values where the public contract calls them.
- [ ] Add a concise case table across all six modes for inclusive equal bounds, both rejection directions, hidden fields, time-only sentinel, step mismatch, disabled endpoints, and allowed versus rejected range crossings. Assert error codes and endpoints.
- [ ] Assert exact Gregorian years `0000` and `9999` through conversion and ISO round-trips, rejection just outside the supported interval, and a UTC value under a non-UTC host timezone. Keep the existing exhaustive Hebrew interval test.

**Exit:** source and installed-package checks fail on a wrong returned value or error, not merely on a missing error array.

## Milestone 3 — Cover public Angular integration paths

- [ ] Exercise `scrollToAbsoluteWeek`, `scrollToCalendarDate`, and `scrollToValue` on an inline picker and a transient trigger, including a date before 1970 and one near the adapter boundary. Assert viewport, focus, and optional selection.
- [ ] Test `WKLY_CONFIG` and per-instance input precedence, `WKLY_LOCALIZATION` fallback, and documented focus/validation behavior after runtime input changes.
- [ ] Extend a browser interaction test to assert calendar grid structure, row and column positions, selected/current/disabled state, accessible names, and range endpoint changes.

**Exit:** these exported methods and accessibility states have observable assertions in the supported browser suite.

## Milestone 4 — Prepare and verify publication

- [ ] Decide the initial shared-package release versions and align all numbered packages' internal dependency ranges with the versions that will be published. Keep each numbered package's first version component equal to its Angular suffix and review its peer ranges against the verified matrix. Update documentation and the lockfile together.
- [ ] Build from a clean install, pass the complete CI and packed-consumer matrix, and inspect the exact tarballs and manifests to be published. Prepare a repeatable release procedure for core, adapters, presentation, then Angular 11–22, including registry-name checks and recovery if a publish step fails.
- [ ] Publish only after the release artifacts and procedure are reviewed. Verify the registry resolves every intended version and that a fresh installation uses those exact artifacts.

**Exit:** the published package graph matches the tested tarballs, and every support claim has a passing consumer check.
