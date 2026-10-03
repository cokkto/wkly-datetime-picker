# Development plan

This is the current work tracker for WKLY. Update a milestone when its implementation changes, and add newly observed issues to the [regression log](REGRESSIONS.md) with reproduction evidence. Keep this plan limited to work that remains.

## Current state

The workspace has three shared packages and numbered Angular integration build targets for 11–22. `supported-angular.json` drives isolated compatibility builds and packed-consumer tests. The showcase has an evergreen host and independently compiled versioned testbeds. The public release target is one name, `@wkly/datetime-picker`, with Angular-specific major version lines. No workflow yet maps the internal build artifacts to that public name, publishes packages, or updates release versions automatically. No confirmed product regressions are currently open.

## Milestone 4 — Add a Hijri calendar example and adapter coverage

- [ ] Choose and document the supported Hijri calendar variant, conversion rules, supported interval, and any dependency. Implement a showcase Hijri adapter using the public `WklyCalendarAdapter` contract, following the Hebrew example's source-only distribution model. Keep public values canonical Gregorian UTC strings.
- [ ] Add Hijri showcase and versioned testbed examples alongside Hebrew, including an Arabic RTL picker and a paired Gregorian/Hijri example showing the same selected day in both calendars.
- [ ] Update the root README's custom-calendar section with direct Git source links and usage examples for both Hebrew and Hijri. State explicitly that these adapters are available from the Git repository and are not shipped in npm packages; document any dependencies needed when copying their source. Align the adapter and showcase domain docs.
- [ ] Add unit contracts for both adapters covering known conversion pairs, round trips, exact supported boundaries and out-of-range errors, month identities and lengths, leap years, year transitions, invalid manual dates, and Gregorian UTC wire values under a non-UTC host timezone. Retain the exhaustive Hebrew interval contract and cover Hijri's advertised interval.
- [ ] Add visual tests for Hebrew and Hijri calendar rendering, localized month/year labels, RTL layout, and selected dates at mobile, tablet, and desktop widths. Add functional E2E coverage for date/time and range selection, navigation, localized manual input, validation, and paired-calendar synchronization across versioned testbeds.

**Done when:** both source-only adapters have documented use, working examples, exact conversion/error assertions, and reviewed visual baselines with passing browser behavior checks.

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
