// @ts-strict-ignore
import * as fs from 'fs';
import { join } from 'path';

import * as lootFs from '#platform/server/fs';
import { logger } from '#platform/server/log';
import type { GlobalPrefsJson } from '#types/prefs';

import type * as T from './index-types';

const getStorePath = () => join(lootFs.getDataDir(), 'global-store.json');
let store: GlobalPrefsJson;
let persisted = true;

// Gives each write a unique temp file so concurrent writes never interleave
// into the same file before being atomically renamed into place.
let writeCounter = 0;

// Serializes disk writes. Without this, two in-flight writes could finish out
// of order and let an older snapshot clobber a newer one on disk.
let pendingSave: Promise<void> = Promise.resolve();

export const init: T.Init = function ({ persist = true } = {}) {
  if (persist) {
    store = loadStore(getStorePath());
  } else {
    store = {};
  }

  persisted = persist;
};

function loadStore(storePath: string): GlobalPrefsJson {
  let contents: string;
  try {
    contents = fs.readFileSync(storePath, 'utf8');
  } catch (err) {
    // No store yet (first run) - start fresh. Anything other than a missing
    // file is unexpected, so surface it but still fall back to defaults.
    if (err?.code !== 'ENOENT') {
      logger.error('Could not read global preferences, using defaults', err);
    }
    return {};
  }

  try {
    const parsed = JSON.parse(contents);
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      throw new Error('Global preferences are not a JSON object');
    }
    return parsed;
  } catch (err) {
    // The file exists but isn't a usable preferences object - either invalid
    // JSON (most likely truncated by an interrupted write, e.g. the process was
    // killed mid-write during an app update) or valid JSON of the wrong shape.
    // Don't silently discard the user's preferences: back the file up so it can
    // be recovered, and log loudly.
    const backupPath = `${storePath}.corrupt`;
    try {
      fs.writeFileSync(backupPath, contents, 'utf8');
      logger.error(
        `Could not parse global preferences at ${storePath}; backed up the corrupt file to ${backupPath} and started with defaults`,
        err,
      );
    } catch (backupErr) {
      logger.error(
        `Could not parse global preferences at ${storePath}, and failed to back up the corrupt file; starting with defaults`,
        backupErr,
      );
    }
    return {};
  }
}

function _saveStore(): Promise<void> {
  if (!persisted) {
    return Promise.resolve();
  }

  // Queue this write behind any in-flight one. Using `writeStore` for both
  // outcomes means a failed write doesn't permanently block the queue. Each
  // queued write snapshots the latest store when it actually runs, so the file
  // always ends up reflecting the most recent state.
  pendingSave = pendingSave.then(writeStore, writeStore);
  return pendingSave;
}

async function writeStore(): Promise<void> {
  const storePath = getStorePath();
  // Write to a unique temp file and atomically rename it into place. This
  // guarantees the store file is always either the old or the new complete
  // contents - never a half-written file - even if the process is killed
  // mid-write (such as during an app update).
  const tmpPath = `${storePath}.${process.pid}.${writeCounter++}.tmp`;

  try {
    await fs.promises.writeFile(tmpPath, JSON.stringify(store), 'utf8');
    await fs.promises.rename(tmpPath, storePath);
  } catch (err) {
    // Best-effort cleanup of the temp file; ignore failures (it may never have
    // been created).
    try {
      await fs.promises.rm(tmpPath, { force: true });
    } catch {}
    throw err;
  }
}

export const getItem: T.GetItem = function (key) {
  return new Promise(function (resolve) {
    return resolve(store[key]);
  });
};

export const setItem: T.SetItem = function (key, value) {
  store[key] = value;
  return _saveStore();
};

export const removeItem: T.RemoveItem = function (key) {
  delete store[key];
  return _saveStore();
};

export async function multiGet<K extends readonly (keyof GlobalPrefsJson)[]>(
  keys: K,
): Promise<{ [P in K[number]]: GlobalPrefsJson[P] }> {
  const results = keys.map(key => [key, store[key]]) as {
    [P in keyof K]: [K[P], GlobalPrefsJson[K[P]]];
  };

  // Convert the array of tuples to an object with properly typed properties
  return results.reduce(
    (acc, [key, value]) => {
      acc[key] = value;
      return acc;
    },
    {} as { [P in K[number]]: GlobalPrefsJson[P] },
  );
}

export const multiSet: T.MultiSet = function (keyValues) {
  keyValues.forEach(function ([key, value]) {
    store[key] = value;
  });
  return _saveStore();
};

export const multiRemove: T.MultiRemove = function (keys) {
  keys.forEach(function (key) {
    delete store[key];
  });
  return _saveStore();
};
