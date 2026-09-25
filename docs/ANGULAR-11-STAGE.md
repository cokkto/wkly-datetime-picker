# Angular 11 package split

This is the first stage of `requirements.rev02.md`. It establishes the package boundary and Angular 11 calendar runtime inside the evergreen showcase. It does not release packages or claim Angular 12–22 picker compatibility.

| Package | Responsibility |
| --- | --- |
| `wkly-datetime-picker.core` | Immutable week coordinates and arithmetic |
| `wkly-datetime-picker.adapters` | Calendar conversion, ISO values, validation |
| `wkly-datetime-picker` | Angular-independent presentation types, localization, input names, coercion, stylesheet |
| `wkly-datetime-picker.11` | Angular 11 component, module, forms, dialog, optional CDK overlay |

The shared `WklyPickerInputs` interface defines the input contract. Each Angular package implements it using the decorators or input APIs supported by its Angular version. Arabic and Hebrew `TRANSLATIONS` are showcase fixtures passed as plain data to the runtime; the library retains English fallbacks and accepts application translations.

The dependency direction is `core → adapters`, with the shared presentation package using both for its input types; the Angular 11 package consumes all three. Shared packages have no Angular or RxJS dependency. The Angular 11 package declares Angular 11 and RxJS 6 peers, with Angular 11 CDK optional for the overlay entry point. Its initial version is `11.0.0`; shared packages remain at `0.1.0` during this stage.

## Local commands

```sh
corepack pnpm install
npm run build
npm test
npm run showcase:start
npm run showcase:build
npm run pack:check
```

`supported-angular.json` lists selectable calendar majors; Angular 11 is the only configured picker package so far. The main Angular 22 showcase remains shared. Its menu swaps a tiny iframe runtime that boots the selected Angular version and renders the matching package. pnpm installs compatible dependency versions per workspace importer using a shared store and hoisted `node_modules`. Adding another major needs only a compatible picker package, a tiny runtime importer, and a manifest entry. `wkly:configure` and the runtime events use plain serializable data; the protocol is documented in the showcase README.

## Consumer import migration

Move Angular imports from `wkly-datetime-picker` to `wkly-datetime-picker.11`. Move optional CDK imports from `wkly-datetime-picker/cdk-overlay` to `wkly-datetime-picker.11/cdk-overlay`. Core and adapter imports are unchanged. The Angular 11 entry point re-exports the former common public types and constants, so import declarations usually only need the package path changed. The old `wkly-datetime-picker` package is now Angular-independent and no longer exports the Angular module or component.

```ts
import { WklyDateTimePickerModule, WKLY_CLOCK } from 'wkly-datetime-picker.11';
import { WklyDateTimePickerOverlayModule } from 'wkly-datetime-picker.11/cdk-overlay';
```

## Remaining design work

The full requirement is feasible in stages. Angular 12–22 packages need their own compiler versions, peer dependencies, and verified build and interaction harnesses. The `Angular.SharedRevision.AngularRevision` release planner, affected package detection, CI matrix, tags, publishing, retries, and recovery instructions are still to be implemented. A shared revision must be maintained in inspectable repository metadata before automated releases begin. No release branch is needed for this package layout.
