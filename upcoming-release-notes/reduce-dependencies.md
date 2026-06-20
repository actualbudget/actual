---
category: Maintenance
authors: [MatissJanis]
---

Reduce the number of bundled dependencies. `lodash` has been replaced with the lighter `es-toolkit`, and several small utility packages (`ua-parser-js`, `memoize-one`, `promise-retry`, and the `@juggle/resize-observer` polyfill) are now handled by native browser APIs and small built-in helpers.
