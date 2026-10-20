# Open regressions

## Firefox showcase popover height equality

On Windows with Node 24.15.0, the showcase smoke journey fails on `/calendars/` when opening the first panel's local-time information popover. The exact height assertion in `projects/wkly-datetime-picker.tests/showcase/catalogue.spec.cjs:115` expects `1327.5166015625` CSS pixels and receives `1327.5167236328125`, a difference of approximately `0.00012` pixels. This is an observed geometry assertion failure; it does not establish a visible layout regression.

Reproduced twice on 2026-10-20 after building the showcase documentation branch, once in the full browser run and once with the focused command below. Chromium and WebKit pass. Retries were disabled.

```sh
npm run showcase:build
npm run test:showcase -- --project=firefox-showcase
```

## Recording and verifying issues

Record confirmed failures with reproduction evidence and focused commands from the repository root; see the [developer guide](README.DEV.md). Investigate with retries disabled. Screenshot baselines record appearance; geometry assertions check correctness. Check affected Angular versions and browsers after a fix, remove resolved entries and update the [development plan](DEVELOPMENT-PLAN.md).
