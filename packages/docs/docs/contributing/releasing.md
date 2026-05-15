# How to Cut a Release

## General information

In the open-source version of Actual, there are 4 NPM packages:

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

### Release branch

A release branch and PR are automatically cut at 17:00 UTC on the 25th of each month. To cut one manually, run [this GitHub Action](https://github.com/actualbudget/actual/actions/workflows/cut-release-branch.yml).

The release notes workflow automatically generates a blog post and updates `docs/releases.md` from the files in `upcoming-release-notes/`. This runs each time the release PR is updated, so there is no need to manually copy notes into the docs.

Fixes that need to be included in the release should be cherry-picked onto the release branch manually.

## Release process

### Stabilize the release

- [ ] Fix spelling in the generated release notes as needed.
- [ ] Share the release PR in the release channel on Discord.
- [ ] Wait until at least 2 other maintainers have approved the release.

### Merge and tag the release

- [ ] Merge the release PR to master.
- [ ] Create the tag on the **release branch** and push it. When the tag is pushed, it triggers the Docker stable image, all NPM packages and the Desktop app to be built and published.
  ```bash
  git checkout release/vX.Y.Z
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

Patch releases (e.g. `v26.5.1`) ship a small, targeted set of fixes on top of an existing release. Unlike monthly releases, the release branch is built by cherry-picking specific commits from `master` onto the previous release tag, so unrelated in-progress work on `master` is not pulled in.

### Build the release branch

- [ ] Identify the commits on `master` that should be included in the patch release and note their commit hashes.
- [ ] Check out the previous release tag and create a new release branch from it:
  ```bash
  git checkout v26.5.0
  git checkout -b release/v26.5.1
  ```
- [ ] Cherry-pick each commit onto the new branch, in the same order they were merged to `master`:
  ```bash
  git cherry-pick <commit-sha>
  ```
- [ ] Push the release branch. This is the branch that will be tagged later — **do not tag it yet**:
  ```bash
  git push -u {remote} release/v26.5.1
  ```

### Open the release PR against master

The release branch is what gets tagged, but the version bump, release notes cleanup, and blog post still need to land on `master` so future releases pick them up.

- [ ] Check out `master` and create a new branch from it (e.g. `release-notes/v26.5.1`).
- [ ] In this branch:
  - Bump the version in the relevant `package.json` files.
  - Delete the `upcoming-release-notes/*.md` files that correspond to the cherry-picked commits.
  - Add a new blog post under `packages/docs/blog/` (see [`2026-02-22-release-26-2-1.md`](https://github.com/actualbudget/actual/blob/master/packages/docs/blog/2026-02-22-release-26-2-1.md) for an example).
- [ ] Commit the changes and open a PR against `master`. Include a link to the previously pushed release branch (e.g. `release/v26.5.1`) in the PR description so reviewers can see exactly what is shipping.

### Tag the release

- [ ] Once the PR has been approved and merged, tag the **release branch** (not `master`) and push the tag:
  ```bash
  git checkout release/v26.5.1
  git tag v26.5.1
  git push {remote} v26.5.1
  ```

From here the rest of the release pipeline (NPM, Docker, Desktop, GitHub draft release) runs automatically. Follow the [Verify the release](#verify-the-release) and [Finalize the release](#finalize-the-release) steps above to complete the rollout.
