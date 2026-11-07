import type { StorageBackend } from '#platform/server/sqlite';

// Which engine the backend worker uses for budget files. It has to be known
// before the worker starts, so it travels from the main thread in the init
// message instead of living in the backend's own preferences. A URL
// parameter sets it once; the stored value applies from then on.

export const STORAGE_BACKEND_KEY = 'actual:storage-backend';
export const STORAGE_BACKEND_URL_PARAM = 'storage';
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
// a reload or a later settings change is not overridden by a stale link
export function resolveStorageBackend(): StorageBackend {
  const url = new URL(window.location.href);
  const requested = url.searchParams.get(STORAGE_BACKEND_URL_PARAM);
  if (requested != null) {
    if (isStorageBackend(requested)) {
      setStoredStorageBackend(requested);
    }
    url.searchParams.delete(STORAGE_BACKEND_URL_PARAM);
    try {
      window.history.replaceState(window.history.state, '', url);
    } catch {
      // A stale parameter only matters for the next load
    }
  }
  return getStoredStorageBackend();
}
