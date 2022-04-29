# How to cut a release

In the open-source version of Actual, all updates go through npm. There are two libraries:

* `@actual-app/api`: The API for the underlying functionality. This includes the entire backend of Actual, meant to be used with node.
* `@actual-app/web`: A web build that will serve the app with a web frontend. This includes both the frontend and backend of Actual. It includes the backend as well because it's built to be used as a Web Worker.

Both the API and web libraries are versioned together. This may change in the future, but because the web library also brings along its own backend it's easier to maintain a single version for now. That makes it clear which version the backend is regardless of library.

## Releasing `@actual-app/api`

This generates a bundle for the API:

```
cd packages/loot-core
yarn build:api
```

The built files live in `lib-dist`, so we need to copy them to the API package:

```
cp lib-dist/bundle.api* ../api/app
```

Next, bump the version on package.json. Finally, publish it:

```
npm publish
```

## Releasing `@actual-app/web`

In the root of `actual` (not just `desktop-client`), run this:

```
./bin/package-browser
```

This will compile both the backend and the frontend into a single directory in `packages/desktop-client/build`. This directory is all the files that need to be published. After bumping the version, publish `desktop-client`:

```
cd packages/desktop-client
npm publish
```
