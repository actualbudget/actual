---
unlisted: true
---

# Browser Storage Engine (Experimental)

Actual is trying out a new way of storing budget files in the browser. Today the web app keeps each budget in IndexedDB through a compatibility layer (absurd-sql) that needs `SharedArrayBuffer`, and every change costs several round trips. The new engine uses SQLite’s own WebAssembly build and keeps budget files in the browser’s private file system ([OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)), which is faster, uses less memory and does not need the `SharedArrayBuffer` headers.

This page is for people who want to try it before it becomes the default. Everything on it is temporary.

## What It Needs

- Chrome or Edge 108 or later, Firefox 111 or later, Safari 16.4 or later, served over HTTPS (or from `localhost`).
- Browsers without private file system access (older versions, private browsing in Safari) get a fallback that keeps the database in memory and saves it to IndexedDB about once a second. It works, but it is slower to open and only one tab can use a budget at a time.

## Turning It On

1. Go to **Settings** and click **Experimental** in the settings navigation.
2. Tick **New browser storage engine**. The app reloads.

The choice is remembered by the browser, not by the budget. It covers every budget opened in that browser, and your other browsers and devices keep their own setting.

Each budget is moved to the new storage the first time it is opened. Actual asks before it moves a budget:

- **Download backup** saves a copy of the budget first. It is the same file that **Settings → Export data** gives you, and you can bring it back with **Import file** on the list of budget files.
- **Continue** moves the budget and opens it. The loading screen shows the progress, and the old copy is deleted only after the moved budget has been checked.
- **Not now** opens the budget on the previous storage instead, and turns the new storage engine off again. You can turn it back on in the same place as before.

**Not now** is only offered while no budget in the browser is on the new storage. After that, the previous engine could not read the budgets that have moved. To go back anyway, use the setting as described under [Turning It Off](#turning-it-off), which moves them back first.

Opening Actual once with `?storage=opfs` added to the address, for example `https://your-server.example/?storage=opfs`, turns it on as well. You do not need the parameter again.

## Turning It Off

Untick **New browser storage engine** in the same place. It moves every budget back to the old layout before the app reloads, so nothing is lost. Opening Actual with `?storage=legacy` only changes the preference: a budget already on the new storage keeps using it.

Close Actual in all other tabs before switching either way.

## Things to Know

- A budget can be open in one browser tab at a time. Other tabs on the same budget are served by that tab (this is how Actual already works); a tab that cannot reach it shows an "already open in another tab" message.
- The data stays on your device, exactly as before. Syncing with a server is unchanged.
- If something goes wrong, open an issue with the browser and version you used, what you were doing, and anything the browser console shows.
