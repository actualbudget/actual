---
title: Browser Storage Engine (Experimental)
unlisted: true
---

# Browser Storage Engine (Experimental)

Actual is trying out a new way of storing budget files in the browser. Today the web app keeps each budget in IndexedDB through a compatibility layer (absurd-sql) that needs `SharedArrayBuffer`, and every change costs several round trips. The new engine uses SQLite’s own WebAssembly build and keeps budget files in the browser’s private file system ([OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)), which is faster, uses less memory and does not need the `SharedArrayBuffer` headers.

This page is for people who want to try it before it becomes the default. Everything on it is temporary.

## What it needs

- Chrome or Edge 108 or later, Firefox 111 or later, Safari 16.4 or later, served over HTTPS (or from `localhost`).
- Browsers without private file system access (older versions, private browsing in Safari) get a fallback that keeps the database in memory and saves it to IndexedDB about once a second. It works, but it is slower to open and only one tab can use a budget at a time.

## Turning it on

Open Actual once with `?storage=opfs` added to the address, for example `https://your-server.example/?storage=opfs`. The choice is remembered by the browser; you do not need the parameter again.

Each budget is moved to the new storage the first time it is opened. The loading screen shows the progress. The old copy is deleted only after the moved budget has been checked.

A setting with the same effect appears under **Settings → Experimental** once you run `localStorage.setItem('devEnableStoragePrefs', 'true')` in the browser console and reload.

## Turning it off

Use the setting described above. It moves every budget back to the old layout before the app reloads, so nothing is lost. Opening Actual with `?storage=legacy` only changes the preference: a budget already on the new storage keeps using it.

Close Actual in all other tabs before switching either way.

## Things to know

- A budget can be open in one browser tab at a time. Other tabs on the same budget are served by that tab (this is how Actual already works); a tab that cannot reach it shows an "already open in another tab" message.
- The data stays on your device, exactly as before. Syncing with a server is unchanged.
- If something goes wrong, open an issue with the browser and version you used, what you were doing, and anything the browser console shows.
