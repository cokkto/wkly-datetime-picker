# Shared showcase runtime

This private project supplies the public showcase's picker controller/template, configuration types, locale registration and theme rules. The newest `wkly-datetime-picker.runtime.N` module compiles it with matching Angular, TypeScript, Material and CDK dependencies and imports `wkly-datetime-picker.N`. Numbered runtime projects retain their toolchains for independently built picker test hosts; they no longer expose controlled showcase applications.

`src/runtime-controller.ts` manages configuration and picker events. `src/runtime-protocol.ts` defines local configuration/event types; communication uses Angular inputs and outputs. The catalogue and controls live in `projects/wkly-datetime-picker.showcase/src/`. Controlled testbed layouts, routes and Angular contract pages have been removed; the [test project](../wkly-datetime-picker.tests/README.md) provides its own public-API fixtures.

The public `/calendars/` example links Gregorian, Hebrew and Hijri date pickers through the shared selection service. Hijri uses the source-only civil calendar adapter. See [showcase usage and GitHub Pages](../../docs/SHOWCASE.md).

```sh
npm run showcase:start
npm run showcase:build
npm run test:showcase -- --project=chromium-showcase
```
