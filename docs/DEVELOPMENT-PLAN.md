# Development plan

This is the current work tracker for WKLY. Update a milestone when its implementation changes, and add newly observed issues to the [regression log](REGRESSIONS.md) with reproduction evidence. Keep this plan limited to work that remains.

## Current state

The workspace has three shared packages and numbered Angular integration build targets for 11–22. `supported-angular.json` drives isolated compatibility builds and packed-consumer tests. The showcase has an evergreen host and independently compiled versioned testbeds. The public release target is one name, `@wkly/datetime-picker`, with Angular-specific major version lines. No workflow yet maps the internal build artifacts to that public name, publishes packages, or updates release versions automatically. The browser geometry regressions below remain open.

## Milestone 1 — Resolve confirmed layout regressions

- [ ] Fix day-column overflow at narrow width and CSS zoom, tracked as [M02-LAYOUT-01](REGRESSIONS.md#m02-layout-01--day-columns-overflow).
- [ ] Fit the requested number of complete week rows under fractional CSS zoom, tracked as [M02-LAYOUT-02](REGRESSIONS.md#m02-layout-02--fractional-zoom-clips-weeks).
- [ ] Rerun geometry checks across the affected browser profiles and refresh screenshots only after correctness assertions pass.

**Done when:** the focused layout assertions pass without skips or expected-failure annotations.

## Milestone 2 — Complete value and validation contracts

- [ ] Assert accepted, rejected, and thrown results for `rangeValidator` and `validators`, including arguments and ordered range endpoints.
- [ ] Add a compact case matrix across all six modes for inclusive equal bounds, rejection directions, hidden fields, time-only sentinel, steps, disabled endpoints, and range crossings.
- [ ] Assert exact Gregorian year boundaries `0000` and `9999`, out-of-range rejection, and UTC values under a non-UTC host timezone. Keep the existing exhaustive Hebrew interval contract.

**Done when:** source and installed-package checks detect wrong values and exact error codes, not only missing errors.

## Milestone 3 — Cover public Angular behavior

- [ ] Exercise `scrollToAbsoluteWeek`, `scrollToCalendarDate`, and `scrollToValue` on inline and transient pickers, including pre-1970 and adapter-boundary dates.
- [ ] Test `WKLY_CONFIG` precedence, localization fallback, and focus/validation behavior after runtime input changes.
- [ ] Resolve the mismatch between locale identifiers and translation catalog keys: `locale` accepts values such as `en-GB` and `he-IL`, but label lookup currently uses only `en` and `he`. Define consistent matching and fallback for regional and language-only entries, then add tests for both. When resolved, update the root README's localization examples and precedence rules, `docs/API.md`, and any affected domain documentation to match the implemented behavior.
- [ ] Assert calendar grid semantics, selected/current/disabled states, accessible names, and range endpoint changes in a browser.

**Done when:** public methods and accessibility behavior have observable browser assertions.

## Milestone 4 — Prepare publication

- [ ] Confirm permission to publish under the `@wkly` npm scope. `@wkly/datetime-picker` had no public registry entry on 2026-10-03; absence of a public entry does not establish scope ownership.
- [ ] Map each internal `wkly-datetime-picker.N` build to an outgoing `@wkly/datetime-picker@N.S.A` artifact with the matching Angular peer range and CDK entry point. Align shared-package dependencies and versions with the artifacts to publish.
- [ ] Define repeatable release steps for changed shared packages followed by the affected picker lines; include registry-name checks, tags, partial-failure recovery, and artifact verification. Keep normal development on `main`.
- [ ] Build from a clean install, pass the full compatibility and packed-consumer matrix, and inspect the exact tarballs and manifests.
- [ ] Publish only after reviewing those artifacts and the procedure, then verify fresh installation against the registry artifacts.

**Done when:** the published package graph matches tested artifacts and every support claim has a passing consumer check.

## Milestone 5 — Release automation

- [ ] Implement inspectable shared-revision metadata and the documented `N.S.A` version increments, where `N` is the Angular major, `S` the shared revision, and `A` the Angular-specific revision.
- [ ] For an Angular-only fix, build and publish only that major's next `N.S.(A+1)` artifact; for a shared change, build and publish `N.(S+1).0` for every supported major, plus changed shared-package artifacts.
- [ ] Add affected-package release planning, idempotent publishing, tags, and clear release summaries only after the manual procedure is proven.

**Done when:** a rerun cannot create a conflicting version or partial untracked release.
