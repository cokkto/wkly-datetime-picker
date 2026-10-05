# Development plan

This is the current work tracker for WKLY. Keep it limited to work that remains. Record confirmed failures with reproduction evidence in the [regression log](REGRESSIONS.md).

## Current state

The workspace has three shared packages and Angular integration build targets for 11–22. The current test project covers source/installed contracts, picker domains, packed AOT/SSR/browser consumers and versioned showcase journeys. The [test coverage index](TEST-DOMAINS.md) links their assertions; the [developer guide](README.DEV.md#checks) describes development, push, PR and release checks. [Compatibility CI](COMPATIBILITY-CI.md#pipeline) runs these checks in separate matrix jobs on pushes to main, pull requests to main and manual dispatch.

The public release target is one name, `@wkly/datetime-picker`, with Angular-specific major version lines. Mapping internal artifacts to that name, publishing and automatic version updates remain future work. The [calendar title interaction](REGRESSIONS.md#calendar-title-interaction) remains an open UI issue.

## Next milestone

Prepare the package artifacts and release procedure for publication.

## Milestone 7 — Prepare publication

- [ ] Confirm permission to publish under the `@wkly` npm scope. `@wkly/datetime-picker` had no public registry entry on 2026-10-03; absence of a public entry does not establish scope ownership.
- [ ] Map each internal `wkly-datetime-picker.N` build to an outgoing `@wkly/datetime-picker@N.S.A` artifact with the matching Angular peer range and CDK entry point. Align shared-package dependencies and versions with the artifacts to publish.
- [ ] Define repeatable release steps for changed shared packages followed by the affected picker lines; include registry-name checks, tags, partial-failure recovery, and artifact verification. Keep normal development on `main`.
- [ ] Build from a clean install, pass the full compatibility and packed-consumer matrix, and inspect the exact tarballs and manifests.
- [ ] Publish only after reviewing those artifacts and the procedure, then verify fresh installation against the registry artifacts.

**Done when:** the published package graph matches tested artifacts and every support claim has a passing consumer check.

## Milestone 8 — Release automation

- [ ] Implement inspectable shared-revision metadata and the documented `N.S.A` version increments, where `N` is the Angular major, `S` the shared revision, and `A` the Angular-specific revision.
- [ ] For an Angular-only fix, build and publish only that major's next `N.S.(A+1)` artifact; for a shared change, build and publish `N.(S+1).0` for every supported major, plus changed shared-package artifacts.
- [ ] Add affected-package release planning, idempotent publishing, tags, and clear release summaries only after the manual procedure is proven.

**Done when:** a rerun cannot create a conflicting version or partial untracked release.

## Milestone 9 — Demo page

Evergreen showcase main page will act as demo page for WKLY calendar.

- [ ] Change the main page calendar configuration to a date range.
