# @wkly/presentation

Shared presentation contracts, rendering helpers, draft validation, and CSS for WKLY. This Angular-independent package supplies common behavior to every supported Angular picker version. Use it to build a custom host or presentation extension. Applications wanting the complete Angular component should install [@wkly/datetime-picker](https://www.npmjs.com/package/@wkly/datetime-picker).

Showcase: [https://cokkto.github.io/wkly-datetime-picker](https://cokkto.github.io/wkly-datetime-picker)

## Install

```sh
npm install @wkly/presentation
```

Depends on `@wkly/core` and `@wkly/adapters`, and provides CommonJS, ES modules, TypeScript declarations, and `picker.css`. Declare core or adapters as direct dependencies if you import them in your code.

## Use shared contracts

```ts
import {
  DEFAULT_OVERSCAN_WEEKS,
  WklyJumpOptions,
} from '@wkly/presentation';

const jump: WklyJumpOptions = { align: 'center', focus: true };
console.log(DEFAULT_OVERSCAN_WEEKS); // 3 buffered weeks on each side
```

Custom hosts can include the shared stylesheet through their bundler:

```css
@import '@wkly/presentation/picker.css';
```

## Functionality

- `WklyPickerInputs`, `WklyPickerOutputs`, and binding-name constants describe the shared picker interface.
- Configuration, localization, clock, viewport, close-reason, and jump types keep hosts consistent.
- `createWeekRows` combines immutable weeks and adapter dates into cells with localized labels, accessibility text, annotations, and disabled/hidden states.
- `calendarMonthBounds` computes full-month coordinates from a supported anchor, including partial adapter boundary months, without converting unsupported edges.
- `validateDrafts` checks editable calendar and time drafts before commit, preserving invalid drafts for error reporting.
- `draftDayDifference` and `setDraftDayDifference` support relative range-end editing.
- `picker.css` supplies the shared layout and theme variables.

Renderable rows follow continuous absolute weeks; month and year labels annotate those rows. Angular components, dialogs, forms, and the optional CDK overlay are supplied by `@wkly/datetime-picker`. See its [consumer guide](https://github.com/cokkto/wkly-datetime-picker#readme) for UI usage.

See the [API reference](https://github.com/cokkto/wkly-datetime-picker/blob/main/docs/API.md). [MIT license](LICENSE).
