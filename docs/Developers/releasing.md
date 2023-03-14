---
title: 'How To Cut A Release'
---

In the open-source version of Actual, all updates go through npm. There are two libraries:

`@actual-app/api`: The API for the underlying functionality. This includes the entire backend of Actual, meant to be used with node.
`@actual-app/web`: A web build that will serve the app with a web frontend. This includes both the frontend and backend of Actual. It includes the backend as well because it's built to be used as a Web Worker.

Both the API and web libraries are versioned together. This may change in the future, but because the web library also brings along its own backend it's easier to maintain a single version for now. That makes it clear which version the backend is regardless of library.
Releasing @actual-app/api

### This generates a bundle for the API:

```bash
yarn build:api
```

Next, bump the version on package.json. Finally, publish it:

```bash
cd packages/loot-core
npm publish
```

### Releasing @actual-app/web

In the root of actual (not just desktop-client), run this:

```bash
./bin/package-browser
```

This will compile both the backend and the frontend into a single directory in packages/desktop-client/build. This directory is all the files that need to be published. After bumping the version, publish desktop-client:

```bash
cd packages/desktop-client
npm publish
```

### Versioning strategy

We used to version according to the date when the release was made. For example: if a release was cut on 02-10-2022, then the release number was `22.10.2`. This posed some challenges if critical bugs were spotted after the release. It meant we had to wait for the next day to cut a new relase.

Starting from `v23.3.x` we changed how we version Actual by keeping the core philosophy the same. The new versioning strategy is: include the year and month of the release in the version number. But for minor version numbers: start at `0` and increment by +1 for each subsequent bug-fix release.

For example:

- `v23.3.0` - first release launched on 15th of March, 2023;
- `v23.3.1` - critical bugfix launched on the same date;
- `v23.3.2` - another bugfix launched later in the month of March;
- `v23.4.0` - first release launched on 9th of April, 2023;
