# Shared WKLY presentation package

`wkly-datetime-picker` is the Angular-independent presentation source package. It does not export an Angular picker component. Applications use `@wkly/datetime-picker@N.x.x`, where N matches their Angular major; this source package supplies common contracts and styling to the versioned integration builds.

| Source | Role |
| --- | --- |
| `src/public-api.ts` | Picker input/output names, configuration, localization, viewport and jump types |
| `src/week-rows.ts` | Turns generated weeks and adapter dates into renderable rows and labels |
| `src/draft-validation.ts` | Validates editable calendar and time drafts before commit |
| `src/picker.component.css` | Shared picker theme and layout rules, emitted as `picker.css` |

The package depends on [core](../../docs/CORE-AND-ADAPTERS.md) and adapters, never on Angular. The numbered integrations use these shared contracts and the CSS. Change common behavior here when it should apply to every supported Angular major; check the [API reference](../../docs/API.md), [Angular integration guide](../../docs/ANGULAR.md), and [developer routine](../../docs/README.DEV.md) before changing public behavior.

Renderable rows are derived from absolute weeks and the active calendar adapter. Month and year labels annotate those rows; they are not calendar containers. The default overscan is three weeks on each side of the visible viewport. Draft validation reports invalid dates without silently changing the committed value.

`calendarMonthBounds` derives full-month coordinates from a supported anchor, including partial adapter boundary months. It avoids converting unsupported month edges; the numbered pickers use it for viewport positioning. Source and installed unit contracts cover this boundary behavior.

```sh
npm run build
npm test
npm run test:installed
```
