# Open regressions

- Initial npm publication remains incomplete because public version metadata is missing. [Bootstrap run 37340041426](https://github.com/cokkto/wkly-datetime-picker/actions/runs/37340041426) on main commit `80eec1db698108b1ccc41722035fa940ab4ddf5e` reported `+ @wkly/core@0.1.0`, then immediate verification failed. The public tarball downloads and matches the reviewed SHA-512 integrity, but `npm view @wkly/core@0.1.0 dist.integrity --registry=https://registry.npmjs.org/` still returns 404 several minutes later, including authenticated and uncached metadata requests. Remaining packages have not been published. Confirm package visibility before retrying; retain the original release manifest.

## Recording and verifying issues

Record confirmed failures with reproduction evidence and focused commands from the repository root; see the [developer guide](README.DEV.md). Investigate with retries disabled. Screenshot baselines record appearance; geometry assertions check correctness. Check affected Angular versions and browsers after a fix, remove resolved entries and update the [development plan](DEVELOPMENT-PLAN.md).
