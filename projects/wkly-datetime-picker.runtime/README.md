# Shared showcase and testbed source

This private project provides the shared picker template/controller, configuration types, locale registration, picker theme rules, and four bounded testbed layouts. Each `wkly-datetime-picker.runtime.N` compiles this source independently with its own Angular, TypeScript, Material, and CDK dependencies. Version-specific modules import the matching picker package; their component wrappers use the shared template.

The evergreen showcase imports the latest runtime module directly. Configuration and events use Angular inputs/outputs, with no iframe or window-message protocol. Shared catalogue data and controls live in `wkly-datetime-picker.showcase/src`; they are also compiled into each testbed.

Test routes are `/cases/{empty|contained|form|booking}/<example-id>`. `/` lists every combination. The empty fixture is the default for component regression tests. The other three verify a finite integration contract, not arbitrary consumer CSS. Shell selectors avoid picker internals; the showcase stylesheet is never included in a testbed.
