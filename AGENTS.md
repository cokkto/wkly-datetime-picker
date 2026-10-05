# Repository instructions for AI contributors

- Start at [`docs/README.md`](docs/README.md) for project context. Read only the linked domain documents and source paths relevant to the task before widening the search.
- Treat [`docs/DEVELOPMENT-PLAN.md`](docs/DEVELOPMENT-PLAN.md) as the work tracker. Update it when a milestone is implemented (remove implemented milestone, do not add fixed or implemented entries), or when a new big issue appears; record minor bugs, confirmed regressions and reproduction evidence in [`docs/REGRESSIONS.md`](docs/REGRESSIONS.md).
- Run `npm run format` after every set of file updates, including documentation or configuration changes, before reporting the work complete.
- Keep comments focused on intent, invariants, and behavior that is easy to miss. Update nearby comments when changing the behavior they describe.
