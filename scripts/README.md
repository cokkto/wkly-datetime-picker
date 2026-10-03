# Repository scripts

Run scripts through the root [`package.json`](../package.json) when a matching npm command exists. They operate from the repository root; `supported-angular.json` defines the registered Angular majors. For the normal workflow and test routine, use the [developer guide](../docs/README.DEV.md).

| Scripts | Purpose |
| --- | --- |
| `build.cjs`, `pack.cjs`, `verify-packed-consumer.cjs` | Build library artifacts, inspect tarballs, and verify consumer installation |
| `compatibility.cjs`, `compatibility.test.cjs` | Plan and run isolated per-major compatibility checks |
| `test.cjs`, `test-installed.cjs` | Run source and installed shared-package contracts |
| `lint.cjs`, `lint.test.cjs` | Lint source, templates, and tooling |
| `showcase-build.cjs`, `serve.cjs`, `showcase-server.cjs`, `showcase-server.test.cjs` | Compile and serve the evergreen showcase and versioned testbeds; test host routing |
| `playwright.cjs`, `playwright-api.cjs` | Launch the browser suite with its workspace-resolved Playwright toolchain |

`npm run showcase:test:e2e:update` changes screenshot baselines. Review those images before committing them.
