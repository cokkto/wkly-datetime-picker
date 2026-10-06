# Development plan

This is the current work tracker for WKLY. Keep it limited to work that remains. Record confirmed failures with reproduction evidence in the [regression log](REGRESSIONS.md).

## Current state

The workspace has three shared packages and Angular integration build targets for 11–22. The current test project covers source/installed contracts, picker domains, packed AOT/SSR/browser consumers and public showcase smoke checks. The [test coverage index](TEST-DOMAINS.md) links their assertions; the [developer guide](README.DEV.md#checks) describes development, push, PR and release checks. [Compatibility CI](COMPATIBILITY-CI.md#pipeline) runs these checks in separate matrix jobs on pushes to main, pull requests to main and manual dispatch.

The public picker uses one name, `@wkly/datetime-picker`, with Angular-specific major version lines. Isolated compatibility builds qualify the scoped dependency graph. `release-state.json` records the common revision and package inputs; release preparation updates versions on a branch for review. The [publication procedure](PUBLICATION.md) retains candidates before npm writes and completes a release after registry verification.

No milestones are currently queued.
