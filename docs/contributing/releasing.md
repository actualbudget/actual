# How To Cut A Release

In the open-source version of Actual, all updates go through npm. There are two libraries:

`@actual-app/api`: The API for the underlying functionality. This includes the entire backend of Actual, meant to be used with node.
`@actual-app/web`: A web build that will serve the app with a web frontend. This includes both the frontend and backend of Actual. It includes the backend as well because it's built to be used as a Web Worker.

Both the API and web libraries are versioned together. This may change in the future, but because the web library also brings along its own backend it's easier to maintain a single version for now. That makes it clear which version the backend is regardless of library.
Releasing @actual-app/api

### Releasing @actual-app/api

```bash
cd packages/api
vim package.json # bump the version
yarn build
yarn npm publish --access public
```

### Releasing @actual-app/web

In the root of actual (not just desktop-client), run this:

```bash
yarn build:browser
```

This will compile both the backend and the frontend into a single directory in `packages/desktop-client/build`. This directory is all the files that need to be published. After bumping the version, publish desktop-client:

```bash
cd packages/desktop-client
yarn npm publish --access public
```

### Versioning strategy

We used to version according to the date when the release was made. For example: if a release was cut on 02-10-2022, then the release number was `22.10.2`. This posed some challenges if critical bugs were spotted after the release. It meant we had to wait for the next day to cut a new release.

Starting from `v23.3.x` we changed how we version Actual by keeping the core philosophy the same. The new versioning strategy is: include the year and month of the release in the version number. But for minor version numbers: start at `0` and increment by +1 for each subsequent bug-fix release.

For example:

- `v23.3.0` - first release launched on 15th of March, 2023;
- `v23.3.1` - critical bugfix launched on the same date;
- `v23.3.2` - another bugfix launched later in the month of March;
- `v23.4.0` - first release launched on 9th of April, 2023;

### Release PRs

When cutting a release, create a PR to each of the `actual` and `actual-server` repositories. Make sure to name the branch `release/X.Y.Z` where `X.Y.Z` is the version number. This will trigger the release notes tooling, which will comment on your PR with the generated release notes. You can then copy-paste the release notes into the `Release-Notes.md` file in the `docs ` repository.

This automation will also delete all the outdated release note files from the `upcoming-release-notes` directory. Make sure you have merged the latest `master` into the release branch and allowed the automation to run before you merge the release PR so all of the files get properly cleaned up.

### GitHub Releases

Once you’ve merged and tagged the release, go to the releases page and publish a new release. Use this as the body of the release note:

```markdown
:link: [View release notes](https://actualbudget.org/blog/release-23.10.0)
```
