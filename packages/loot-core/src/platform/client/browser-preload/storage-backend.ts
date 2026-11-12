import type { StorageBackend } from '#platform/server/sqlite';

// Which engine the backend worker uses for budget files. It has to be known
// before the worker starts, so it travels from the main thread in the init
// message instead of living in the backend's own preferences. A URL
// parameter sets it once; the stored value applies from then on.

export const STORAGE_BACKEND_KEY = 'actual:storage-backend';
export const STORAGE_BACKEND_URL_PARAM = 'storage';
// Reveals the engine setting in Experimental settings while it is hidden
// from everyone else
export const STORAGE_PREFS_KEY = 'devEnableStoragePrefs';
export const DEFAULT_STORAGE_BACKEND: StorageBackend = 'legacy';

const STORAGE_BACKENDS: readonly string[] = ['legacy', 'opfs', 'memory-idb'];

export function isStorageBackend(value: unknown): value is StorageBackend {
  return typeof value === 'string' && STORAGE_BACKENDS.includes(value);
}

export function getStoredStorageBackend(): StorageBackend {
  try {
    const stored = localStorage.getItem(STORAGE_BACKEND_KEY);
    return isStorageBackend(stored) ? stored : DEFAULT_STORAGE_BACKEND;
  } catch {
    // Storage access can throw (private modes, sandboxed frames); the
    // default applies
    return DEFAULT_STORAGE_BACKEND;
  }
}

// Always stored explicitly, so an opt-out survives a change of the default
export function setStoredStorageBackend(backend: StorageBackend): void {
  try {
    localStorage.setItem(STORAGE_BACKEND_KEY, backend);
  } catch {
    // Without storage the default applies on the next load
  }
}

// Reads `?storage=<backend>` once, stores it and strips it from the URL, so
// a reload or a later settings change is not overridden by a stale link.
// Using the flag also reveals the setting, so the way back is in the app.
export function resolveStorageBackend(): StorageBackend {
  const url = new URL(window.location.href);
  const requested = url.searchParams.get(STORAGE_BACKEND_URL_PARAM);
  if (requested != null) {
    if (isStorageBackend(requested)) {
      setStoredStorageBackend(requested);
      try {
        localStorage.setItem(STORAGE_PREFS_KEY, 'true');
      } catch {
        // Without storage the setting stays hidden
      }
    }
    url.searchParams.delete(STORAGE_BACKEND_URL_PARAM);
    try {
      window.history.replaceState(window.history.state, '', url);
    } catch {
      // A stale parameter only matters for the next load
    }
  }
  // A valid link decides this load even where the choice could not be
  // stored, with storage full or denied; it then just does not outlast it
  return isStorageBackend(requested) ? requested : getStoredStorageBackend();
}
