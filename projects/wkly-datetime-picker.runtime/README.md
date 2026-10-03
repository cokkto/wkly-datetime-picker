# Shared showcase and testbed runtime

This private project provides the shared picker controller and template, configuration types, locale registration, theme rules, and four bounded testbed layouts. Each `wkly-datetime-picker.runtime.N` compiles it independently with its matching Angular, TypeScript, Material, and CDK dependencies. The versioned runtime module imports `wkly-datetime-picker.N`; the evergreen showcase imports the newest runtime module directly.

`src/runtime-controller.ts` manages configuration and picker events. `src/testbed.component.ts` and its template render a single controlled case. `src/runtime-protocol.ts` defines local TypeScript configuration and event types; communication uses Angular inputs and outputs, with no iframe or window-message transport. The catalogue and controls live in `projects/wkly-datetime-picker.showcase/src/` and are compiled into each testbed.

The testbed index is `/`. Case routes are `/cases/{empty|contained|form|booking}/<example-id>`. The `empty` layout is the minimal component fixture; the others exercise bounded integration layouts. Testbed CSS avoids the picker internals and does not include the showcase stylesheet.

```sh
npm run showcase:start
npm run showcase:build
npm run showcase:test:e2e -- --project=angular-22-chromium
```

See [showcase usage](../../docs/SHOWCASE.md) for hosts and case IDs, and the [test project README](../wkly-datetime-picker.tests/README.md) for active assertions.
