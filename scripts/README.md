# Repository scripts

Run scripts through the root [`package.json`](../package.json) when a matching npm command exists. They operate from the repository root; `supported-angular.json` defines the registered Angular majors. For the normal workflow and test routine, use the [developer guide](../docs/README.DEV.md).

| Scripts | Purpose |
| --- | --- |
| `build.cjs`, `pack.cjs`, `verify-packed-consumer.cjs` | Build library artifacts, inspect tarballs, and verify consumer installation |
| `compatibility.cjs`, `compatibility.test.cjs` | Plan and run isolated per-major compatibility checks |
| `public-packages.cjs`, `release.cjs`, `release.test.cjs` | Prepare public-name source copies, collect qualified tarballs, verify OIDC/tag authorization, publish and verify registry installs; see [publication](../docs/PUBLICATION.md) |
| `release-plan.cjs`, `release-record.cjs`, `release-plan.test.cjs` | Fingerprint release inputs, calculate/apply affected versions, require prior completion, retain immutable candidates and finalize verified GitHub releases |
| `test-check.cjs`, `test-check.test.cjs`, `test-all.cjs` | Development, pre-push, PR and release gates; release compatibility alias |
| `test-reporters.cjs`, `test-timings.cjs` | Native Playwright report destinations and package-stage timing evidence |
| `test-domains-run.cjs`, `test-domains.cjs`, `test-host-*.cjs` | Build registry-selected hosts and run one reusable browser context per Angular version/domain |
| `test-host-address.cjs`, `test-host-setup.cjs`, `test-host-server.test.cjs` | Use showcase-style versioned hostnames, check virtual hosts over loopback before workers start and cover isolation/reuse across build selections |
| `test.cjs`, `test-installed.cjs` | Run source and installed shared-package contracts |
| `lint.cjs`, `lint.test.cjs` | Lint source, templates, and tooling |
| `showcase-build.cjs`, `serve.cjs`, `showcase-server.cjs`, `showcase-server.test.cjs` | Compile and serve the public showcase and static route documents; test subpath serving |
| `playwright.cjs` | Launch native Playwright commands with the locked workspace toolchain |

`npm run test:visuals:update` changes screenshot baselines. Review those images before committing them.
