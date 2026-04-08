# How to Cut a Release

In the open-source version of Actual, there are 3 NPM packages:

- [@actual-app/api](https://www.npmjs.com/package/@actual-app/api): The API for the underlying functionality. This includes the entire backend of Actual, meant to be used with Node.
- [@actual-app/web](https://www.npmjs.com/package/@actual-app/web): A web build that will serve the app with a web frontend. This includes both the frontend and backend of Actual. It includes the backend as well because it's built to be used as a Web Worker.
- [@actual-app/sync-server](https://www.npmjs.com/package/@actual-app/sync-server): The entire sync-server and underlying web client in one package. This includes the Server CLI, meant to be used with Node.

All packages and the main Actual release are versioned together. That makes it clear which version of the package should be used with the version of Actual.

### Versioning Strategy

We used to version according to the date when the release was made. For example: if a release was cut on 02-10-2022, then the release number was `22.10.2`. This posed some challenges if critical bugs were spotted after the release. It meant we had to wait for the next day to cut a new release.

Starting from `v23.3.x` we changed how we version Actual while keeping the core philosophy the same. The new versioning strategy is: include the year and month of the release in the version number. But for minor version numbers: start at `0` and increment by +1 for each subsequent bug-fix release.

For example:

- `v23.3.0` - first release launched on 15th of March, 2023;
- `v23.3.1` - critical bugfix launched on the same date;
- `v23.3.2` - another bugfix launched later in the month of March;
- `v23.4.0` - first release launched on 9th of April, 2023;

## Release branch

A release branch and PR are automatically cut at 17:00 UTC on the 25th of each month. To cut one manually, run [this GitHub Action](https://github.com/actualbudget/actual/actions/workflows/cut-release-branch.yml).

The release notes workflow automatically generates a blog post and updates `docs/releases.md` from the files in `upcoming-release-notes/`. This runs each time the release PR is updated, so there is no need to manually copy notes into the docs.

Fixes that need to be included in the release should be cherry-picked onto the release branch manually.

## Stabilise the release

- [ ] Fix spelling in the generated release notes as needed.
- [ ] Share the release PR in the release channel on Discord.
- [ ] Wait until at least 2 other maintainers have approved the release.

## Merge and tag the release

- [ ] Merge the release PR to master.
- [ ] Create the tag on the **release branch** and push it. When the tag is pushed, it triggers the Docker stable image, all NPM packages and the Desktop app to be built and published.
  ```bash
  git checkout release/vX.Y.Z
  git tag vX.Y.Z
  git push {remote} vX.Y.Z
  ```

All NPM packages should be automatically released and pushed to the NPM registry. Check them here:

- [@actual-app/api](https://www.npmjs.com/package/@actual-app/api)
- [@actual-app/web](https://www.npmjs.com/package/@actual-app/web)
- [@actual-app/sync-server](https://www.npmjs.com/package/@actual-app/sync-server)

For the Windows Store desktop app, a submission will be automatically uploaded and submitted for certification. The certification process can take up to 3 business days; once complete the app will be in the Store. You can check the update status [here](https://partner.microsoft.com/en-us/dashboard) if you have permission. Note that the Store UI will not correctly reflect the submission status for about 30 minutes after submission.

Finally, a draft GitHub release should be automatically created [here](https://github.com/actualbudget/actual/releases).

Once the GitHub release is published, the Flathub publish workflow will trigger for the Linux desktop app. A PR will be created against the [Actual Flathub Repository](https://github.com/flathub/com.actualbudget.actual/pulls) and the core maintainers will be assigned as reviewers. The Core team will review the PR and merge it to `master`, which will kick off a production release to the Flathub Store. It can take anywhere from hours to a few days before the app will be available in the Flathub Store.

## Finalize the release

- [ ] After the Docker image for the release is ready and pushed to Docker Hub, remember to deploy it and do a quick smoke test to verify things still work as expected.
- [ ] Un-draft the GitHub release which will send announcement notifications to all apps.
- [ ] Approve and merge the [Flathub Release PR](https://github.com/flathub/com.actualbudget.actual/pulls) to master.
- [ ] Wrap up by sending an announcement on Discord and Twitter.
- [ ] Wait one to two days to see if any new bugs show up that need a patch release.
