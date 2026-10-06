# Publishing WKLY

The `wkly` npm organization belongs to `cokkto`. Releases originate from `main`. The public graph contains `@wkly/core`, `@wkly/adapters`, and `@wkly/presentation` at their shared source-manifest versions, followed by `@wkly/datetime-picker@N.S.A` for Angular 11–22. Initial versions are `0.1.0` for shared packages and `11.0.0` through `22.0.0` for picker lines.

Local imports retain their internal names. Compatibility builds rename manifests, module imports, TypeScript aliases and ng-packagr allowlists only in isolated copies. ng-packagr generates the public entry points, Angular metadata and source maps. Shared declarations always use TypeScript 4.1.6; outgoing shared dependencies use exact versions. Every Angular line must qualify identical shared tarball bytes. Packing normalizes scoped filenames and gzip wrapping with Huffman-only compression, avoiding older npm filename bugs and Node 16/newer zlib compression differences while retaining npm's tar payload.

## Qualify, review and publish

1. Merge reviewed source changes to `main`. **Prepare npm release** runs automatically on main pushes and can also be dispatched manually. It compares package inputs with `release-state.json`, calculates versions, and pushes a release branch with an affected-package summary and review link. Open, review and merge its version PR; where repository policy permits Actions to create PRs, the workflow opens it automatically. A shared change advances `S` for every picker line and resets `A`; an Angular-only fix advances only its line's `A`. Changed shared artifacts and shared packages whose exact dependencies change receive patch increments. Do not edit versions manually.
2. Wait for **Compatibility result** on that exact main commit. The complete workflow qualifies source contracts, installed public shared packages, all Angular picker/browser combinations, base/CDK tarball integrity, AOT, SSR and showcase journeys. Set **Compatibility result** as the required main branch check in GitHub repository settings.
3. Open Actions → **Publish npm packages** → **Run workflow**. Select `main`, enter the successful compatibility run ID, and leave **publish** false. The workflow rejects another branch, an unsuccessful/incomplete gate, a different source commit or unprepared package changes.
4. Download `reviewed-npm-release`. Inspect `manifest.json`, tarball contents (`tar -tzf <file.tgz>`), manifests, peers, dependencies, license, README/API and base/CDK entries. `publish` lists the candidates that will be released; `packages` also contains unchanged shared dependencies needed to qualify and verify consumers. An Angular-only plan qualifies its one picker major; a shared plan qualifies all twelve. The manifest records release ID, source commit and SHA-512 integrity. Collection rejects missing selected majors, mixed commits, altered tarballs and differing shared artifacts.
5. After reviewing those artifacts, rerun with **publish** true and the same compatibility run ID. Publication uses the qualified tarballs without rebuilding. A change to main requires another successful gate and artifact review.

For a local preview after `npm run test:release`:

```sh
node scripts/release.cjs collect .compat .test-build/release <full-source-commit-sha>
```

Local collection is a preview; publishing requires the full GitHub gate for a clean main checkout. Per-major release evidence is written after base/CDK integrity, AOT and SSR pass; the publishing workflow additionally requires the complete browser and shared gates to succeed.

## Inspect and apply a plan locally

```sh
npm run release:plan
npm run release:prepare
```

The planner writes `.test-build/release-plan.json` and `release-summary.md` only when package inputs change. Preparation updates affected source-manifest versions and `release-state.json`; run `npm run format`, review and commit them together. Reapplying an unchanged plan leaves versions unchanged. A stale plan or manual version change fails before any manifest write.

If a previous prepared release exists, download its `published.json` from the `wkly-release-<release-id>` GitHub release and supply it when preparing the next release:

```sh
npm run release:prepare -- .test-build/release-plan.json .test-build/previous-release/published.json
```

Preparation requires a matching verified receipt covering every previously selected artifact. The GitHub workflow additionally requires that previous release to be finalized. A draft or missing receipt blocks new versions until recovery finishes. Release preparation and publication share a non-cancelling concurrency group.

Fingerprints cover package sources/configuration, normalized manifests without versions or stripped build scripts, toolchains, the build/public-name scripts, root README, API reference and license. Changed exact shared dependencies propagate new shared artifact versions. Test-only, showcase-only, workflow and source-local README edits do not increment package versions. Line endings are normalized across Windows and Linux. New Angular lines need an explicit metadata baseline migration along with their registry entry.

The preparation workflow uses the repository GitHub token to push its release branch and explicitly dispatches compatibility CI for that branch. Its summary links to PR creation. Optional automatic PR creation requires the repository variable `WKLY_RELEASE_CREATE_PR=true` and Actions settings permitting GitHub Actions to create pull requests. That setting additionally permits Actions to approve PR reviews; the workflow does not enable it. No additional npm secret is needed.

The initial release used a short-lived token; that token and its GitHub bootstrap secret have been revoked/removed. The publishing workflow now uses trusted publishing exclusively.

## npm trusted publishing

After the four package names exist, add a GitHub Actions trusted publisher in the settings of each package: `@wkly/core`, `@wkly/adapters`, `@wkly/presentation`, and `@wkly/datetime-picker`.

| Field | Value |
| --- | --- |
| Organization or user | `cokkto` |
| Repository | `wkly-datetime-picker` |
| Workflow filename | `publish.yml` |
| Environment name | Leave empty |
| Allowed actions | Direct publishing (`npm publish`) and dist-tag management (`npm dist-tag`) |

The workflow uses GitHub-hosted runners, Node 24.15.0, npm 11.21.0, and `id-token: write`. npm 11.21.0 or later is required for trusted dist-tag management. Reviewed releases use **publish** true. Before publication, the workflow verifies each package's OIDC exchange and authorization by writing its existing `latest` tag value directly to the registry, then records `trusted-publishing.json`. This tests all four bindings even when every candidate version and tag already exists; `npm dist-tag add` can otherwise skip an unchanged tag without proving write access. Direct-publishing permission must also be enabled in each saved publisher configuration. Package publishing access is **Require two-factor authentication and disallow bypass 2FA tokens**, which still permits trusted publishing. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

## Tags and recovery

Before npm writes, publication creates an annotated `wkly-release-<release-id>` tag at the qualified source and a draft GitHub release retaining the immutable manifest and tarballs. A retry validates retained bytes and fills any missing assets without replacing existing ones. The initial release retains its original `npm-release-80eec1db6981` tag.

Publication submits only selected candidates: changed core, adapters, presentation, then affected picker lines in ascending Angular order. It submits the candidates before waiting for public metadata, allowing npm to process versions concurrently. Unselected shared dependencies must already exist with identical integrity. Shared packages use `latest`; picker lines use `angular-11` through `angular-22`. Picker `latest` advances only when the newest supported line is part of the plan; an older Angular-only fix preserves it. Tags cannot move backwards. Consumers should pin their Angular major.

All candidate versions are checked before the first mutation. Existing versions are skipped only if registry integrity matches the qualified tarball. A conflict requires a new source version; do not unpublish or overwrite it. Only HTTP 404 means a registry name is absent; other registry errors stop the release. After npm accepts a tarball, verification waits up to ten minutes for matching public version metadata. Missing metadata keeps the release incomplete; integrity conflicts and registry errors fail immediately. If npm reports success but metadata remains absent, preserve the run and manifest and investigate registry visibility before retrying publication.

After partial failure, rerun with the same successful compatibility run ID and unchanged versions/tarballs. Matching published versions are verified and skipped, missing versions publish, and missing tags are repaired. Finish recovery before advancing main. If main has advanced, qualify it again: existing versions must still have identical bytes, or changed artifacts need new versions. Preserve the original manifest and partial-run URL.

Final verification freshly installs each selected picker major from npm twice: base without CDK, then with pinned CDK. Strict peer resolution must pass, and all four installed versions and lockfile SHA-512 integrities must match the qualified tarballs. This proves registry consumers receive the artifacts already qualified by AOT, SSR and browsers. Success writes `published.json` with the release ID and candidate selection. A verification failure remains incomplete and can be retried; `progress.json` and attempt-specific draft assets retain partial-publication evidence.

After registry verification, the workflow retains `published.json` and `trusted-publishing.json`, adds the affected-version summary and workflow URL, and finalizes the draft release. Existing immutable receipts must match before reuse. Development continues on `main`.
