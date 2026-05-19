# How to Cut a Release

## General information

In the open-source version of Actual, there are 5 NPM packages:

- [@actual-app/core](https://www.npmjs.com/package/@actual-app/core): The shared core library (loot-core) used by the other packages. Platform-agnostic business logic, database operations, and calculations.
- [@actual-app/api](https://www.npmjs.com/package/@actual-app/api): The API for the underlying functionality. This includes the entire backend of Actual, meant to be used with Node.
- [@actual-app/web](https://www.npmjs.com/package/@actual-app/web): A web build that will serve the app with a web frontend. This includes both the frontend and backend of Actual. It includes the backend as well because it's built to be used as a Web Worker.
- [@actual-app/sync-server](https://www.npmjs.com/package/@actual-app/sync-server): The entire sync-server and underlying web client in one package. This includes the Server CLI, meant to be used with Node.
- [@actual-app/cli](https://www.npmjs.com/package/@actual-app/cli): A companion CLI used as a terminal-based client for Actual.

All packages and the main Actual release are versioned together. That makes it clear which version of the package should be used with the version of Actual.

### Versioning Strategy

We used to version according to the date when the release was made. For example: if a release was cut on 02-10-2022, then the release number was `22.10.2`. This posed some challenges if critical bugs were spotted after the release. It meant we had to wait for the next day to cut a new release.

Starting from `v23.3.x` we changed how we version Actual while keeping the core philosophy the same. The new versioning strategy is: include the year and month of the release in the version number. But for minor version numbers: start at `0` and increment by +1 for each subsequent bug-fix release.

For example:

- `v23.3.0` - first release launched on 15th of March, 2023;
- `v23.3.1` - critical bugfix launched on the same date;
- `v23.3.2` - another bugfix launched later in the month of March;
- `v23.4.0` - first release launched on 9th of April, 2023;

### Release branches

There are two branches involved in every release:

- `release`: the single long-lived branch where release tags live. This is the branch we actually base the release on, and where commits are cherry-picked to if we want them included.
- `release-notes/X.Y.Z`: the branch that is used for the release PR. It holds the generated docs pages. It is deleted once a version ships.

Splitting them avoids merge conflicts between cherry-picks on the release branch and the version-bump/docs commits that need to be merged back to `master`.

Monthly cuts run automatically at 17:00 UTC on the 25th of each month. To cut a release manually (monthly or patch), run the [Cut release workflow](https://github.com/actualbudget/actual/actions/workflows/cut-release-branch.yml).

Changes that need to be included in the release after the cut has been made should be cherry-picked onto `release`. Each cherry-pick triggers regeneration of the release notes on `release-notes/X.Y.Z`. Human edits to frontmatter (release highlights, author, etc.) on `release-notes/X.Y.Z` are preserved across regenerations as long as they are above the autogen marker.

### Release candidate builds

While a release is in progress (i.e. while the `release-notes/X.Y.Z` branch exists), release candidate builds are published automatically every day from the `release` branch so the upcoming release can be tested before it ships. They are versioned `X.Y.Z-rc.<date>`.

- **Docker:** the `rc` and `rc-alpine` tags, built by [publish-release-candidate.yml](https://github.com/actualbudget/actual/actions/workflows/publish-release-candidate.yml).
- **npm:** all five packages under the `rc` dist-tag, published by [publish-npm-packages.yml](https://github.com/actualbudget/actual/actions/workflows/publish-npm-packages.yml) on its nightly schedule.
- **Desktop:** a rolling `Release candidate` pre-release on the [releases page](https://github.com/actualbudget/actual/releases), tagged `vX.Y.Z-rc`, with macOS, Windows, and Linux installers refreshed daily.

Publishing stops once the `release-notes/X.Y.Z` branch is deleted. The rolling `vX.Y.Z-rc` pre-release and tag are not removed automatically, so delete them by hand after the release ships.

## Release process

### Stabilize the release

- [ ] Fix spelling and add highlights in the generated release notes as needed (edit `release-notes/X.Y.Z` directly).
- [ ] Smoke test the [release candidate builds](#release-candidate-builds) (server and desktop) to catch problems before the release ships.
- [ ] Share the release PR in the release channel on Discord.
- [ ] Wait until at least 2 other maintainers have approved the release.

### Merge and tag the release

- [ ] Merge the `release-notes/X.Y.Z` PR to master.
- [ ] Create the tag on the **`release` branch** and push it. When the tag is pushed, it triggers the Docker stable image, all NPM packages and the Desktop app to be built and published.
  ```bash
  git checkout release
  git tag vX.Y.Z
  git push {remote} vX.Y.Z
  ```

All NPM packages should be automatically released and pushed to the NPM registry; confirm [on NPM](https://www.npmjs.com/package/@actual-app/sync-server).

Docker images should be automatically released and pushed to Docker Hub; confirm [on the Docker tags page](https://hub.docker.com/r/actualbudget/actual-server/tags).

For the Windows Store desktop app, a submission will be automatically uploaded and submitted for certification. The certification process can take up to 3 business days; once complete the app will be in the Store. You can check the update status [on the partner dashboard](https://partner.microsoft.com/en-us/dashboard) if you have permission. Note that the Store UI will not correctly reflect the submission status for about 30 minutes after submission.

Finally, a draft GitHub release should be automatically created; confirm [on the releases page](https://github.com/actualbudget/actual/releases).

### Verify the release

- [ ] Deploy the new server Docker image and do a quick smoke test to verify things still work as expected.
- [ ] Perform the same smoke test on the desktop app corresponding to your platform (attached to the draft release).

### Finalize the release

- [ ] Un-draft the GitHub release which will send announcement notifications to all apps and create a PR to the [Actual Flathub Repository](https://github.com/flathub/com.actualbudget.actual/pulls).
- [ ] Send an announcement on Discord and Twitter.
- [ ] Approve and merge the [Flathub Release PR](https://github.com/flathub/com.actualbudget.actual/pulls) to master. After merge, it can take anywhere from hours to a few days before the app will be available in the Flathub Store.

## Cutting a patch release

Patch releases (e.g. `26.6.1`) ship a small, targeted set of fixes on top of the latest release. Because `release` is a single long-lived branch, a patch is just a version bump and cherry-picks on top of the previous release, with no new branch to create.

### Cut the patch

Run the [Cut release workflow](https://github.com/actualbudget/actual/actions/workflows/cut-release-branch.yml) manually with:

- `version`: the patch version (e.g. `26.6.1`).
- `release-date`: when the patch is expected to ship (optional).

This creates `release-notes/26.6.1`. It's worth noting that the release branch after a prior releases have no `upcoming-release-notes/*.md` files in them, so the initial release-notes run generates an empty blog, content will fill in once changes are cherry-picked in to the `release` branch.

The rest of the release process remains the same as a major release. Cherry-pick the appropriate changes into the `release` branch. Follow the steps to get the `release-notes/X.Y.Z` branch ready, then follow the merging and tagging steps outlined above.
