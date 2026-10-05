# Publishing WKLY

The `wkly` npm organization belongs to `cokkto`. Releases originate from `main`. The public graph contains `@wkly/core`, `@wkly/adapters`, and `@wkly/presentation` at their shared source-manifest versions, followed by `@wkly/datetime-picker@N.S.A` for Angular 11–22. Initial versions are `0.1.0` for shared packages and `11.0.0` through `22.0.0` for picker lines.

Local imports retain their internal names. Compatibility builds rename manifests, module imports, TypeScript aliases and ng-packagr allowlists only in isolated copies. ng-packagr generates the public entry points, Angular metadata and source maps. Shared declarations always use TypeScript 4.1.6; outgoing shared dependencies use exact versions. Every Angular line must qualify identical shared tarball bytes. Packing normalizes scoped filenames and gzip wrapping with Huffman-only compression, avoiding older npm filename bugs and Node 16/newer zlib compression differences while retaining npm's tar payload.

## Qualify, review and publish

1. Merge reviewed release changes to `main`, including manually chosen source-manifest versions. Automatic version increments remain Milestone 8 work. A shared change advances `S` for every picker line and resets `A`; an Angular-only fix advances only its line's `A`. Increment changed shared artifact versions too, including packaged README/API changes.
2. Wait for **Compatibility result** on that exact main commit. The complete workflow qualifies source contracts, installed public shared packages, all Angular picker/browser combinations, base/CDK tarball integrity, AOT, SSR and showcase journeys. Set **Compatibility result** as the required main branch check in GitHub repository settings.
3. Open Actions → **Publish npm packages** → **Run workflow**. Select `main`, enter the successful compatibility run ID, and leave **publish** and **bootstrap** false. The workflow rejects another branch, an unsuccessful/incomplete gate or a different source commit.
4. Download `reviewed-npm-release`. Inspect `manifest.json`, tarball contents (`tar -tzf <file.tgz>`), manifests, peers, dependencies, license, README/API and base/CDK entries. Initial publication has three shared tarballs and twelve picker tarballs. The manifest records source commit and SHA-512 integrity. Collection rejects missing majors, mixed commits, altered tarballs and differing shared artifacts.
5. After reviewing those artifacts, rerun with **publish** true and the same compatibility run ID. Publication uses the qualified tarballs without rebuilding. A change to main requires another successful gate and artifact review.

For a local preview after `npm run test:release`:

```sh
node scripts/release.cjs collect .compat .test-build/release <full-source-commit-sha>
```

Local collection is a preview; publishing requires the full GitHub gate for a clean main checkout. Per-major release evidence is written after base/CDK integrity, AOT and SSR pass; the publishing workflow additionally requires the complete browser and shared gates to succeed.

## Bootstrap authentication

The initial package creation uses the short-lived granular npm token. **Packages and scopes** must grant direct publish access covering `@wkly`, with **Bypass 2FA** enabled. Organization-management permissions alone do not grant publishing rights.

Store it as the repository Actions secret **NPM_BOOTSTRAP_TOKEN**, keeping it out of Git and logs. The ignored local `token.log` is never copied into build workspaces or release artifacts. For the first reviewed publish, enable both **publish** and **bootstrap**. Only the bootstrap step receives the secret; its npm configuration contains an environment-variable reference rather than the token value.

## npm trusted publishing

After the four package names exist, add a GitHub Actions trusted publisher in the settings of each package: `@wkly/core`, `@wkly/adapters`, `@wkly/presentation`, and `@wkly/datetime-picker`.

| Field | Value |
| --- | --- |
| Organization or user | `cokkto` |
| Repository | `wkly-datetime-picker` |
| Workflow filename | `publish.yml` |
| Environment name | Leave empty |
| Allowed actions | Direct publishing (`npm publish`) and dist-tag management (`npm dist-tag`) |

The workflow uses GitHub-hosted runners, Node 24.15.0, npm 11.5.1 or later, and `id-token: write`. Later reviewed releases use **publish** true and **bootstrap** false, independently of the temporary token. Once trusted publishing works, remove the bootstrap secret and revoke the token. npm's **Require two-factor authentication and disallow tokens** package setting still permits trusted publishing. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [token settings](https://docs.npmjs.com/creating-and-viewing-access-tokens/).

## Tags and recovery

Publication orders core, adapters, presentation, then picker lines in ascending Angular order. Shared packages use `latest`; picker lines use `angular-11` through `angular-22`. Picker `latest` advances to the newest supported line after all artifacts are verified. Consumers should pin their Angular major.

All candidate versions are checked before the first mutation. Existing versions are skipped only if registry integrity matches the qualified tarball. A conflict requires a new source version; do not unpublish or overwrite it. Only HTTP 404 means a registry name is absent; other registry errors stop the release. After npm accepts a tarball, verification waits up to ten minutes for matching public version metadata. Missing metadata keeps the release incomplete; integrity conflicts and registry errors fail immediately. If npm reports success but metadata remains absent, preserve the run and manifest and investigate registry visibility before retrying publication.

After partial failure, rerun with the same successful compatibility run ID and unchanged versions/tarballs. Matching published versions are verified and skipped, missing versions publish, and missing tags are repaired. Finish recovery before advancing main. If main has advanced, qualify it again: existing versions must still have identical bytes, or changed artifacts need new versions. Preserve the original manifest and partial-run URL.

Final verification freshly installs every picker major from npm twice: base without CDK, then with pinned CDK. Strict peer resolution must pass, and all four installed versions and lockfile SHA-512 integrities must match the qualified tarballs. This proves registry consumers receive the artifacts already qualified by AOT, SSR and browsers. Success writes `published.json`; a verification failure remains incomplete and can be retried.

After success, create and push an annotated Git tag `npm-release-<first-12-source-sha-characters>` pointing at the qualified source commit. Retain the workflow URL, manifest and verification record in a GitHub release. Development continues on `main`.
