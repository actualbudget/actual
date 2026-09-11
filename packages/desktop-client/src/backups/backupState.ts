// A tiny external store for the backup feature. Destinations hold
// non-serialisable objects (directory handles, clients), so this state
// cannot live in redux; React reads it through `useSyncExternalStore`
// (see `useBackupDestination`).

import type { LocalPrefs } from '@actual-app/core/types/prefs';

import type {
  BackupDestination,
  BackupDestinationStatus,
  BackupWriteResult,
} from './types';

export type BackupState = {
  budgetId: string | null;
  destination: BackupDestination | null;
  status: BackupDestinationStatus | 'unset';
  label: string | null;
  /** ISO timestamp of the last successful backup, or null. */
  lastBackupAt: string | null;
  isBusy: boolean;
  lastResult: BackupWriteResult | null;
};

const INITIAL_STATE: BackupState = {
  budgetId: null,
  destination: null,
  status: 'unset',
  label: null,
  lastBackupAt: null,
  isBusy: false,
  lastResult: null,
};

let state: BackupState = INITIAL_STATE;
const listeners = new Set<() => void>();

export function getBackupState(): BackupState {
  return state;
}

export function setBackupState(patch: Partial<BackupState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) {
    listener();
  }
}

export function resetBackupState() {
  setBackupState(INITIAL_STATE);
}

export function subscribeBackupState(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ── Per-budget timestamps ────────────────────────────────────────────────
//
// These are stored the same way `useLocalPref` stores local prefs
// (`<budgetId>-<prefName>`, JSON encoded) so they are per budget, per
// device and shared between tabs.

const LAST_BACKUP_PREF = 'backups.lastBackupAt' satisfies keyof LocalPrefs;
const LAST_CHANGE_PREF = 'backups.lastChangeAt' satisfies keyof LocalPrefs;

function readTimestamp(budgetId: string, prefName: string): number | null {
  try {
    const raw = localStorage.getItem(`${budgetId}-${prefName}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    const time = typeof parsed === 'string' ? Date.parse(parsed) : NaN;
    return Number.isNaN(time) ? null : time;
  } catch {
    return null;
  }
}

function writeTimestamp(budgetId: string, prefName: string, time: number) {
  try {
    localStorage.setItem(
      `${budgetId}-${prefName}`,
      JSON.stringify(new Date(time).toISOString()),
    );
  } catch {
    // Storage may be unavailable (private mode, quota); the backup itself
    // still happened, so this is not fatal.
  }
}

export function getLastBackupAt(budgetId: string): number | null {
  return readTimestamp(budgetId, LAST_BACKUP_PREF);
}

export function setLastBackupAt(budgetId: string, time: number) {
  writeTimestamp(budgetId, LAST_BACKUP_PREF, time);
  if (state.budgetId === budgetId) {
    setBackupState({ lastBackupAt: new Date(time).toISOString() });
  }
}

export function getLastChangeAt(budgetId: string): number | null {
  return readTimestamp(budgetId, LAST_CHANGE_PREF);
}

export function setLastChangeAt(budgetId: string, time: number) {
  writeTimestamp(budgetId, LAST_CHANGE_PREF, time);
}
