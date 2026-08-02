# Preferences

Actual stores its settings — usually called "prefs" in the codebase — in several different places, depending on what the setting applies to: the device the app runs on, a single budget file, or a budget file on every device it is opened on. When you add a new setting, choosing the right type determines where the value lives, whether it follows the user across devices, and which hook you use to read and write it.

All preference types are defined in `packages/loot-core/src/types/prefs.ts`, and each client-side type has a matching React hook in `packages/desktop-client/src/hooks/` (server prefs are the exception — they are saved through the sync server's API).

## Comparison

|                                               | Global prefs                                             | Synced prefs                                     | Local prefs                                     | Metadata prefs                                         |
| --------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------ |
| **Scope**                                     | The device / app installation                            | A budget file                                    | A budget file on one device                     | A budget file on one device                            |
| **Synced across devices**                     | No                                                       | Yes                                              | No                                              | No                                                     |
| **Applies to every budget file**              | Yes                                                      | No                                               | No                                              | No                                                     |
| **Stored in**                                 | `global-store.json` on desktop, IndexedDB in the browser | The `preferences` table in the budget's database | The browser's local storage, keyed by budget ID | The `metadata.json` file next to the budget's database |
| **Part of the budget file (backups/exports)** | No                                                       | Yes                                              | No                                              | Yes                                                    |
| **React hook**                                | `useGlobalPref`                                          | `useSyncedPref`                                  | `useLocalPref`                                  | `useMetadataPref`                                      |
| **TypeScript type**                           | `GlobalPrefs`                                            | `SyncedPrefs`                                    | `LocalPrefs`                                    | `MetadataPrefs`                                        |

## Global Prefs

Global prefs apply to the whole app installation, no matter which budget file is open. They are read before any budget is loaded, which is why things that affect the app shell itself belong here.

They are stored on the device: in a `global-store.json` file in the app's data directory on desktop, and in IndexedDB in the browser. They never sync anywhere.

## Synced Prefs

Synced prefs belong to a single budget file and travel with it. They are stored in the `preferences` table inside the budget's SQLite database, so changes replicate to every device through the regular sync engine — just like transactions or categories — and they are included in backups and exports.

Use a synced pref when the setting is part of how the user works with that budget and they would expect it to look the same on every device.

Two things to keep in mind:

- Values are always strings. Store booleans as `'true'`/`'false'` and serialize anything more complex as JSON.
- Every change generates a sync message, so avoid writing a synced pref when the value has not actually changed.

## Local Prefs

Local prefs are scoped to a budget file _and_ a device: they are stored in the browser's local storage (or the desktop app's equivalent), keyed by the budget ID. They are not part of the budget file, so they are lost when the browser's site data is cleared, and they never sync.

Use a local pref for transient UI state that should not follow the user to another device.

## Metadata Prefs

Metadata prefs are bookkeeping about the budget file itself, stored in the `metadata.json` file that sits next to the budget's database on the device. They are almost entirely maintained by the app — identifiers, sync bookkeeping, encryption details — rather than being choices the user makes. You will rarely add a new one.

## Server Prefs

There is also a small `ServerPrefs` type for settings that configure the sync server itself. These are saved to the server over its API rather than stored in the client, and they only exist when a sync server is in use.

## Which Type Should a New Setting Use?

- Should the setting follow the budget to every device it is opened on? Use a **synced pref**.
- Does it configure the app itself, regardless of which budget is open? Use a **global pref**.
- Is it per-budget UI state that should stay on this device only? Use a **local pref**.
- Is it something the app tracks about the budget file rather than a user choice? It is probably a **metadata pref**.
