---
category: Enhancements
authors: [MatissJanis]
---

Make the `@actual-app/api` browser build work in production bundlers: load the prebuilt worker verbatim so bundlers no longer re-bundle (and corrupt) it, fail fast with a clear error when the document isn't cross-origin isolated, add an `assetsBaseUrl` option for hosting the wasm/data files elsewhere, and document the required Vite setup.
