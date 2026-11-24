# Browser Storage

The web app keeps each budget file in the browser’s private file system ([OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)) using SQLite’s own WebAssembly build. Earlier versions stored budgets as blocks in IndexedDB through a compatibility layer (absurd-sql) that needed `SharedArrayBuffer`. The new storage is faster, uses less memory, and no longer needs the cross-origin isolation headers described in [Enabling SharedArrayBuffer Access](./shared-array-buffer.md).

## Existing Budgets

A budget is moved to the new storage the first time it is opened after updating. The loading screen shows the progress. The old copy is deleted only after the contents of the moved budget have been checked against it. Budgets synced with a server are unaffected either way: the server keeps its own copy.

If a budget cannot be moved, nothing is deleted and Actual tells you so. Opening the budget again tries once more. While no other budget in the browser uses the new storage yet, the message also offers **Go back to previous storage**. This goes back to the previous engine, as described under [Going Back to the Previous Engine](#going-back-to-the-previous-engine), and tries to open the budget the way it was opened before. If the budget does not open by itself, pick it from the list of files. If it cannot be opened on the previous storage either, the copy in this browser may be damaged: download the budget again from your sync server, or [restore it from a backup](../backup-restore/restore.md).

## Browser Requirements

Chrome and Edge 108, Firefox 111 and Safari 16.4 or later, served over HTTPS or from `localhost`.

Browsers without private file system access (older versions, private browsing in Safari) fall back to keeping the database in memory and saving it to IndexedDB about once a second. Actual shows a warning icon in the title bar when this is the case. It works, but budgets open more slowly and only one tab can use a budget at a time.

## One Budget per Tab

On desktop browsers all tabs share one copy of the budget engine, so you can keep a budget open in several tabs. On iOS and Android each tab runs its own copy and the budget file can only be open in one of them; a second tab shows "already open in another tab" until the first one closes it.

## Going Back to the Previous Engine

For one release the previous engine is still available. Under **Settings → Experimental**, untick **Browser storage engine**: every budget in that browser is moved back, then the app reloads. The previous engine needs the `SharedArrayBuffer` headers again. In a fresh browser profile, opening Actual once with `?storage=legacy` added to the address has the same effect without moving anything.

## Where the Data Is

Everything stays on your device. The `actual` IndexedDB database lists your budget files and holds the small ones, such as `metadata.json`; the SQLite files live under `actual/pools/` in the private file system, or inside IndexedDB when the fallback is in use. If a budget exists only on one device, export it from time to time (**Settings → Export data**).

## Reporting Problems

Open an issue with the browser and version you used, what you were doing, and anything the browser console shows. If a budget failed to move, nothing was deleted: reloading the page tries again.
