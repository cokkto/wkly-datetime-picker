# Development plan

This is the current work tracker for WKLY. Keep it limited to work that remains. Record confirmed failures with reproduction evidence in the [regression log](REGRESSIONS.md).

## Current state

The workspace has three shared packages and Angular integration build targets for 11–22. The current test project covers source/installed contracts, picker domains, packed AOT/SSR/browser consumers and versioned showcase journeys. The [test coverage index](TEST-DOMAINS.md) links their assertions; the [developer guide](README.DEV.md#checks) describes development, push, PR and release checks. [Compatibility CI](COMPATIBILITY-CI.md#pipeline) runs these checks in separate matrix jobs on pushes to main, pull requests to main and manual dispatch.

The public picker uses one name, `@wkly/datetime-picker`, with Angular-specific major version lines. Isolated compatibility builds map internal projects to that name and qualify the scoped shared dependency graph. Automatic version updates remain outstanding; see the [publication procedure](PUBLICATION.md).

## Next milestone

Automate affected-package release planning and the documented `N.S.A` version updates.

## Milestone 8 — Release automation

- [ ] Implement inspectable shared-revision metadata and the documented `N.S.A` version increments, where `N` is the Angular major, `S` the shared revision, and `A` the Angular-specific revision.
- [ ] For an Angular-only fix, build and publish only that major's next `N.S.(A+1)` artifact; for a shared change, build and publish `N.(S+1).0` for every supported major, plus changed shared-package artifacts.
- [ ] Add affected-package release planning, idempotent publishing, tags, and clear release summaries only after the manual procedure is proven.

**Done when:** a rerun cannot create a conflicting version or partial untracked release.
