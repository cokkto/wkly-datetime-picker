# Open regressions

Publication qualification is being rechecked after the initial PR #7 matrix exposed two consumer failures on Linux: older npm pack JSON reported `@wkly/core-0.1.0.tgz` while the created file was `wkly-core-0.1.0.tgz`, and the Angular consumer fixture still imported internal shared package names. The initial run [37320266068](https://github.com/cokkto/wkly-datetime-picker/actions/runs/37320266068) failed at base installation on Angular 11 and at base AOT on Angular 22. Local workspace resolution masked the stale fixture imports. Those CI artifacts also contained identical shared tar payloads with two gzip variants (Node 16 versus newer runtimes). Public imports, normalized tarball paths and normalized gzip wrappers are now under fresh full-matrix qualification.

## Recording and verifying issues

Record confirmed failures with reproduction evidence and focused commands from the repository root; see the [developer guide](README.DEV.md). Investigate with retries disabled. Screenshot baselines record appearance; geometry assertions check correctness. Check affected Angular versions and browsers after a fix, remove resolved entries and update the [development plan](DEVELOPMENT-PLAN.md).
