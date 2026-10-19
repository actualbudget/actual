import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getStoredStorageBackend,
  resolveStorageBackend,
  setStoredStorageBackend,
  STORAGE_BACKEND_KEY,
} from './storage-backend';

afterEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

describe('storage backend flag', () => {
  it('defaults to the sqlite-wasm engine on OPFS', () => {
    expect(getStoredStorageBackend()).toBe('opfs');
    expect(resolveStorageBackend()).toBe('opfs');
  });

  it('stores and reads the chosen backend', () => {
    setStoredStorageBackend('opfs');
    expect(localStorage.getItem(STORAGE_BACKEND_KEY)).toBe('opfs');
    expect(getStoredStorageBackend()).toBe('opfs');
  });

  it('ignores values that are not a backend', () => {
    localStorage.setItem(STORAGE_BACKEND_KEY, 'floppy');
    expect(getStoredStorageBackend()).toBe('opfs');
  });

  it('keeps an explicit choice of the previous engine', () => {
    window.history.replaceState(null, '', '/?storage=legacy');
    expect(resolveStorageBackend()).toBe('legacy');
    expect(getStoredStorageBackend()).toBe('legacy');
  });

  it('takes a one-shot URL parameter, stores it and strips it', () => {
    window.history.replaceState(null, '', '/budget?storage=opfs&other=1');
    expect(resolveStorageBackend()).toBe('opfs');
    expect(localStorage.getItem(STORAGE_BACKEND_KEY)).toBe('opfs');
    expect(window.location.search).toBe('?other=1');
    expect(window.location.pathname).toBe('/budget');
    // Later loads keep the stored choice
    expect(resolveStorageBackend()).toBe('opfs');
  });

  it('drops an unknown URL parameter without changing the stored choice', () => {
    setStoredStorageBackend('memory-idb');
    window.history.replaceState(null, '', '/?storage=nope');
    expect(resolveStorageBackend()).toBe('memory-idb');
    expect(window.location.search).toBe('');
  });

  it('falls back to the default when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(getStoredStorageBackend()).toBe('opfs');
  });
});
