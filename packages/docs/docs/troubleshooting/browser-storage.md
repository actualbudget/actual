# Browser Storage

The web app keeps each budget file in the browser’s private file system ([OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)) using SQLite’s own WebAssembly build. Earlier versions stored budgets as blocks in IndexedDB through a compatibility layer (absurd-sql) that needed `SharedArrayBuffer` and therefore cross-origin isolation headers. Neither is needed any more: the page only has to be served over HTTPS or from `localhost`.

## Existing budgets

A budget stored by an earlier version is moved to the new storage the first time it is opened after updating. The loading screen shows the progress. The old copy is deleted only after the moved budget has been checked. Budgets synced with a server are unaffected either way: the server keeps its own copy.

## Browser requirements

Chrome and Edge 108, Firefox 111 and Safari 16.4 or later.

Browsers without private file system access (older versions, private browsing in Safari) fall back to keeping the database in memory and saving it to IndexedDB about once a second. Actual shows a warning icon in the title bar when this is the case. It works, but budgets open more slowly and only one tab can use a budget at a time.

## One budget per tab

On desktop browsers all tabs share one copy of the budget engine, so you can keep a budget open in several tabs. On iOS and Android each tab runs its own copy and the budget file can only be open in one of them; a second tab shows "already open in another tab" until the first one closes it.

## Where the data is

Everything stays on your device. The `actual` IndexedDB database lists your budget files and holds the small ones, such as `metadata.json`; the SQLite files live under `actual/pools/` in the private file system, or inside IndexedDB when the fallback is in use. If a budget exists only on one device, export it from time to time (**Settings → Export data**).

## Reporting problems

Open an issue with the browser and version you used, what you were doing, and anything the browser console shows. If a budget failed to move, nothing was deleted: reloading the page tries again.
