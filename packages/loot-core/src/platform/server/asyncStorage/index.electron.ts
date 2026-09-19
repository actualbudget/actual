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

// Sibling file holding the last known-good store. Only written by the
// non-atomic EXDEV fallback in writeStore, right before it overwrites the
// store in place, so an interrupted write can be recovered from.
const getRecoveryPath = (storePath: string) => `${storePath}.bak`;

function parseStore(contents: string): GlobalPrefsJson {
  const parsed = JSON.parse(contents);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Global preferences are not a JSON object');
  }
  return parsed;
}

function loadRecoveryStore(storePath: string): GlobalPrefsJson | null {
  const recoveryPath = getRecoveryPath(storePath);
  try {
    return parseStore(fs.readFileSync(recoveryPath, 'utf8'));
  } catch {
    return null;
  }
}

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
    return parseStore(contents);
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
        `Could not parse global preferences at ${storePath}; backed up the corrupt file to ${backupPath}`,
        err,
      );
    } catch (backupErr) {
      logger.error(
        `Could not parse global preferences at ${storePath}, and failed to back up the corrupt file`,
        backupErr,
      );
    }

    // An in-place write (EXDEV fallback) may have been interrupted; prefer the
    // copy it took beforehand over starting from scratch.
    const recovered = loadRecoveryStore(storePath);
    if (recovered) {
      logger.warn(
        `Recovered global preferences from ${getRecoveryPath(storePath)}`,
      );
      return recovered;
    }
    logger.error('No usable global preferences found; starting with defaults');
    return {};
  }
}

// Copies the active store over the recovery file, but only when the active
// file is itself valid: after an interrupted in-place write it may be
// truncated, and copying that would destroy the only good copy left.
async function backupStore(storePath: string): Promise<void> {
  let contents: string;
  try {
    contents = await fs.promises.readFile(storePath, 'utf8');
  } catch (err) {
    if (err?.code !== 'ENOENT') {
      logger.warn('Could not read global preferences to back them up', err);
    }
    return;
  }

  try {
    parseStore(contents);
  } catch {
    logger.warn(
      `Not backing up ${storePath}: it is not valid, keeping the existing recovery copy`,
    );
    return;
  }

  try {
    await fs.promises.writeFile(getRecoveryPath(storePath), contents, 'utf8');
  } catch (err) {
    logger.warn('Could not back up global preferences', err);
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

  const contents = JSON.stringify(store);

  try {
    await fs.promises.writeFile(tmpPath, contents, 'utf8');
    await fs.promises.rename(tmpPath, storePath);
  } catch (err) {
    // Best-effort cleanup of the temp file; ignore failures (it may never have
    // been created).
    try {
      await fs.promises.rm(tmpPath, { force: true });
    } catch {}

    if (err?.code === 'EXDEV') {
      // Some sandboxed installs (e.g. the Microsoft Store / MSIX package on
      // Windows) virtualise the app data folder so that renaming into it
      // counts as crossing filesystems. Fall back to writing the file in
      // place: not atomic, but far better than never being able to save
      // preferences at all.
      logger.warn(
        `Could not atomically replace ${storePath} (EXDEV); writing it in place instead`,
      );
      // Keep the current (complete) store as a recovery copy first, so a
      // crash mid-overwrite doesn't cost the user their preferences.
      await backupStore(storePath);
      await fs.promises.writeFile(storePath, contents, 'utf8');
      return;
    }

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
