# Development plan

This is the current work tracker for WKLY. Update a milestone when its implementation changes, and add newly observed issues to the [regression log](REGRESSIONS.md) with reproduction evidence. Keep this plan limited to work that remains.

## Current state

The workspace has three shared packages and numbered Angular integration build targets for 11–22. `supported-angular.json` drives isolated compatibility builds and packed-consumer tests. The showcase has an evergreen host and independently compiled versioned testbeds. The public release target is one name, `@wkly/datetime-picker`, with Angular-specific major version lines. No workflow yet maps the internal build artifacts to that public name, publishes packages, or updates release versions automatically. No confirmed product regressions are currently open.

## Firefox screenshot coverage

- [ ] Establish and review the four missing Firefox month-boundary screenshot baselines. Geometry now passes across Angular 11–22 using the documented whole-CSS-pixel visibility rule; see [test behavior and verification](../projects/wkly-datetime-picker.tests/README.md#visibility-and-firefox-scroll-rounding) and [remaining screenshot coverage](REGRESSIONS.md#firefox-month-boundary-screenshot-baselines).

## Firefox teardown investigation

- [ ] Reproduce the reported Angular 16 Firefox `Browser.removeBrowserContext` session-store error in the original launch environment. Headless focused repetitions and the Angular 16/22 contract suites pass; this remains a reported browser teardown issue, with no confirmed picker regression. See [investigation evidence](REGRESSIONS.md#reported-firefox-context-teardown-failure).

## Milestone 5 — In X Days
In Manual Input mode, replace the End label with a two-state toggle:
[ End ] | [ In X days ]
Internally, these are two buttons that toggle the End view between Day-Month-Year and InXDays.
Implement a new InXDays view for the End section.
- It is a visual helper, not a separate end-date implementation. Internally, it acts as a proxy that adds the selected number of days to the selected start date and updates the existing end-date object. Validation and all other operations are still performed on the end-date object only.
- The InXDays view contains a single numeric field.
- Its default value is 0, matching the current behavior where the end date initially equals the start date.
- The field must accept both positive and negative integer values, with an absolute range of -9999 to 9999.
- The field should be visually and technically similar to the existing year input/selection field and should behave in the same way wherever applicable.
- On direct input, touch-drag, or scroll, add the selected number of days to the start date and set the resulting date as the end date.
- Reuse as much of the existing year-input implementation as possible to minimize regression risk.
- All new labels and text must be included in the localization object and support localization, including a placeholder for the number, for example: "In {{days}} days".
- The "In X days" toggle label must always display the actual number of days between the current start and end dates, regardless of which End view is currently selected.
  - For example: [ End ] | [ In 17 days ]
- If the calculated end date is invalid according to the validation rules used by the Day-Month-Year view, display the same validation error and a red border around the InXDays field.
- Both End views must always remain synchronized:
  - InXDays is a calculated field that depends on the end date. Its value must be updated whenever the actual end date is updated.
  - Selecting an end date from the calendar must update the end date as it currently does and additionally recalculate the InXDays value.
  - Editing the end date in the Day-Month-Year view must update the InXDays value.
  - Editing the number in the InXDays view must update the end date in the same way as selecting it through the Day-Month-Year view, reusing the same methods or notification channels.
  - Switching between the two views must not change the selected end date.
  - An InXDays value of 0 means that the end date is the same as the start date.
- Negative InXDays values must behave consistently with entering a past date into the End section using the existing Day-Month-Year controls:
  - A negative value may be entered directly or reached by scrolling/touch-dragging below 0.
  - While the negative value is being edited, it temporarily represents an end date before the current start date.
  - After the same debounce interval currently used when entering a past year into the End year field, the start and end dates must be swapped using the same existing swap behavior.
  - After the swap, InXDays must be recalculated from the new start and end dates. For example, entering -17 results in the dates being swapped and the resulting InXDays value becoming 17.
  - Reuse the existing date-swap logic and debounce mechanism rather than implementing separate InXDays-specific swap behavior.
- Add unit tests covering synchronization between both representations when the end date is changed through:
  - the calendar;
  - the Day-Month-Year view;
  - the InXDays view;
  - direct input of a negative InXDays value;
  - scrolling or touch-dragging from 0 into a negative InXDays value;
  - automatic start/end swapping after the existing debounce interval.
### InXDays visual layout
Keep the InXDays view the same height as the existing Day-Month-Year view by arranging its content into the same four logical rows.
Unlike the Day-Month-Year view, InXDays displays in the top field-label row end date instead of labels. So, the same four logical rows are used as follows:
- Row 1 — resulting end date
  Displays the end date calculated from start date + InXDays. This row is informational and is not part of the numeric input component.
- Row 2 — previous value
  Part of the InXDays numeric input component. Displays the previous possible value, equivalent to the previous-year value shown above the Year input in the Day-Month-Year view.
- Row 3 — current value / input field
  Part of the InXDays numeric input component. Contains the editable numeric field, visually and behaviorally equivalent to the Year input field.
- Row 4 — next value
  Part of the InXDays numeric input component. Displays the next possible value, equivalent to the next-year value shown below the Year input in the Day-Month-Year view.
The last three rows therefore form a single spinner-like input component matching the existing Year selector, while the first row uses the otherwise unused vertical space to show the resulting end date.
The InXDays view preserves exactly the same overall vertical footprint as the Day-Month-Year view, and input control located on the same line as in Day-Month-Year view, so switching between the two does not resize or shift the End section.

### Goal
Allow the user to select an end date in either of two ways: by explicitly specifying a calendar date or by specifying the number of days relative to the selected start date, while preserving the existing automatic start/end swap behavior when the selected end precedes the start.

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

## Milestone 8 — Demo page
Evergreen showcase main page will act as demo page for WKLY calendar.

- [] change main page calendar config as date range
