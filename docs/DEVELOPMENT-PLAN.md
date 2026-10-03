# Development plan

This is the current work tracker for WKLY. Update a milestone when its implementation changes, and add newly observed issues to the [regression log](REGRESSIONS.md) with reproduction evidence. Keep this plan limited to work that remains.

## Current state

The workspace has three shared packages and numbered Angular integration build targets for 11–22. `supported-angular.json` drives isolated compatibility builds and packed-consumer tests. The showcase has an evergreen host and independently compiled versioned testbeds. The public release target is one name, `@wkly/datetime-picker`, with Angular-specific major version lines. No workflow yet maps the internal build artifacts to that public name, publishes packages, or updates release versions automatically. No confirmed product regressions are currently open.

## Milestone 5 — Test exact month-label boundary placement

- [ ] Create deterministic fixtures with explicit dates and week offsets for each case below. Assert the actual day position in the seven-day week so an incorrect fixture cannot silently test another boundary.
- [ ] Cover a month starting on the first day of a week: its label at the top-left corner in LTR.
- [ ] Cover a month starting on the last (seventh) day of a week: its label at the top-right corner in LTR.
- [ ] Cover a month starting on the second day of a week: two month labels sharing the top-left area, with the intended staggered tracks and readable text.
- [ ] Cover a month ending on the first day of a week: its ending label at the bottom-left edge in LTR.
- [ ] Cover a month ending on the sixth day of a week: its ending label at the bottom-right edge in LTR.
- [ ] Add screenshot comparisons and independent geometry assertions for exact label text, anchoring, staggering, clipping, and overlap with day cells. Exercise Gregorian, Hebrew, and Hijri month boundaries, including mirrored RTL placement, mobile/tablet/desktop widths, and fractional scales across the configured browser profiles.

**Done when:** all five boundary cases have verified fixtures, reviewed screenshots, and geometry checks that detect misplaced, clipped, or overlapping month labels in LTR and RTL.

## Milestone 6 — Prepare publication

- [ ] Confirm permission to publish under the `@wkly` npm scope. `@wkly/datetime-picker` had no public registry entry on 2026-10-03; absence of a public entry does not establish scope ownership.
- [ ] Map each internal `wkly-datetime-picker.N` build to an outgoing `@wkly/datetime-picker@N.S.A` artifact with the matching Angular peer range and CDK entry point. Align shared-package dependencies and versions with the artifacts to publish.
- [ ] Define repeatable release steps for changed shared packages followed by the affected picker lines; include registry-name checks, tags, partial-failure recovery, and artifact verification. Keep normal development on `main`.
- [ ] Build from a clean install, pass the full compatibility and packed-consumer matrix, and inspect the exact tarballs and manifests.
- [ ] Publish only after reviewing those artifacts and the procedure, then verify fresh installation against the registry artifacts.

**Done when:** the published package graph matches tested artifacts and every support claim has a passing consumer check.

## Milestone 7 — Release automation

- [ ] Implement inspectable shared-revision metadata and the documented `N.S.A` version increments, where `N` is the Angular major, `S` the shared revision, and `A` the Angular-specific revision.
- [ ] For an Angular-only fix, build and publish only that major's next `N.S.(A+1)` artifact; for a shared change, build and publish `N.(S+1).0` for every supported major, plus changed shared-package artifacts.
- [ ] Add affected-package release planning, idempotent publishing, tags, and clear release summaries only after the manual procedure is proven.

**Done when:** a rerun cannot create a conflicting version or partial untracked release.
