# How to Cut a Release

In the open-source version of Actual, all updates go through NPM. There are two libraries:

`@actual-app/api`: The API for the underlying functionality. This includes the entire backend of Actual, meant to be used with Node.

`@actual-app/web`: A web build that will serve the app with a web frontend. This includes both the frontend and backend of Actual. It includes the backend as well because it's built to be used as a Web Worker.

Both the API and web libraries are versioned together. This may change in the future, but because the web library also brings along its own backend it's easier to maintain a single version for now. That makes it clear
which version the backend is regardless of library.

### Versioning Strategy

We used to version according to the date when the release was made. For example: if a release was cut on 02-10-2022, then the release number was `22.10.2`. This posed some challenges if critical bugs were spotted after the release. It meant we had to wait for the next day to cut a new release.

Starting from `v23.3.x` we changed how we version Actual while keeping the core philosophy the same. The new versioning strategy is: include the year and month of the release in the version number. But for minor version numbers: start at `0` and increment by +1 for each subsequent bug-fix release.

For example:

- `v23.3.0` - first release launched on 15th of March, 2023;
- `v23.3.1` - critical bugfix launched on the same date;
- `v23.3.2` - another bugfix launched later in the month of March;
- `v23.4.0` - first release launched on 9th of April, 2023;

## Setting up the PRs
Pull requests will need to be opened in all three repositories - [docs](https://github.com/actualbudget/docs), [actual](https://github.com/actualbudget/actual) and [actual-server](https://github.com/actualbudget/actual-server).

Make sure to name the branch `release/X.Y.Z` where `X.Y.Z` is the version number. This will trigger the release notes tooling, which will comment on your PR with the generated release notes. You can then copy-paste the release notes into the `Release-Notes.md` file in the `docs ` repository.

This automation will also delete all the outdated release note files from the `upcoming-release-notes` directory. Make sure you have merged the latest `master` into the release branch and allowed the automation to run before you merge the release PR so all of the files get properly cleaned up.

### actual
1. Bump the versions in
   - `packages/api/package.json`
   - `packages/desktop-client/package.json`
   - `packages/desktop-electron/package.json`
2. Open the pull request, the release notes workflow will run and collate the release notes into a comment in the PR.
3. The PR can now be marked as ready for review.

### actual-server
1. Bump the version in `package.json`
2. Open the pull request, the release notes workflow will run and collate the release notes into a comment in the PR.
3. The PR can not be finalized until the web package has been released as it uses the new version as a dependency.

Once the `actual` PR has been approved and the new web package has been [published to NPM](#building-and-releasing), the server PR can be finalized.
1. Bump the web dependency version in `package.json`
2. Run `yarn install`
3. Push the updated `package.json` and `yarn.lock`
4. The PR can now be marked as ready for review.

### docs
After the release notes workflows in the actual and actual-server PRs have been run, copy the collated notes into a new blog post using a previous release as a template. The release notes will also need adding to the `docs/releases.md` file.

## Building and Publishing to NPM
Once the web PR has been approved, the new version of the API and web packages need to be published to NPM. If you haven't done this before, another maintainer will need to give you access.

###  @actual-app/api

```bash
cd packages/api
yarn build
yarn npm publish --access public
```

### @actual-app/web

In the root of actual (not just desktop-client), run:

```bash
yarn build:browser
```

This will compile both the backend and the frontend into a single directory in `packages/desktop-client/build`. This directory contains all of the files that need to be published.

Now you can publish the package by running:

```bash
cd packages/desktop-client
yarn npm publish --access public
```

## GitHub Tags and Releases

Once the web and server releases have been merged, they need to be tagged. When the tag is pushed to `actual-server` it will trigger the Docker stable image to be built and published.

Run the below in each repository, or use the GitHub UI.
```bash
git tag vX.Y.Z
git push vX.Y.Z
```

A GitHub release then needs to be created in [actual](https://github.com/actualbudget/actual) using the below as a template.

```markdown
:link: [View release notes](https://actualbudget.org/blog/release-23.10.0)

## Desktop releases

<a href="https://apps.microsoft.com/detail/9p2hmlhsdbrm?cid=Github+Releases&mode=direct">
  <img src="https://get.microsoft.com/images/en-us%20dark.svg" width="200"/>
</a>
```

## Windows Store Releases

The Windows Store release process consists of: logging in, uploading the packages, updating the store listing, and submitting for certification.

It's a relatively straight forward process - Microsoft provide a lot of [documentation for it](https://learn.microsoft.com/en-gb/windows/apps/publish/publish-your-app/msix/create-app-submission).

The steps involved in releasing Actual to the Windows Store are detailed below.

**Login to the Microsoft Partner Center:**

1. Visit the [Microsoft Partner Center](https://partner.microsoft.com/en-us/dashboard)
2. Log in using your Actual Budget account (if you don't have one, ask a core contributor)
3. Navigate to "Apps and Games" and select "Actual Budget"

**Upload the Packages:**

1. Click "Start update" to create a draft release.
2. Under "Product Update", choose "Packages".
3. Delete all of the packages listed for the previous app version.
4. Upload the new Appx Packages and save (artifacts available on the [Release PR](#release-prs)).

**Update the Store Listing:**

1. Under "Product update", select "Store listings".
2. Choose "English" for the english listing.
3. Under "What's new in this version" briefly describe the "Notable improvements" of the release notes.

**Submit to the Store**

When all of the above steps are complete, select "Submit to the Store" to progress to the "Certification" stage.

During the "Certification" stage the app is checked by Microsoft to ensure quality. The certification process can take up to 3 business days, once complete the app will be in the Store.

## Announcement

After the release is out on `actual-server` - remember to deploy it and do a quick smoke test to verify things still work as expected. If they do: continue with sending an announcement on Discord and Twitter.

:tada:
