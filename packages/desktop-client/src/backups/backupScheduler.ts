// Decides when the next automatic backup should run. Pure logic with
// injectable timers so it can be unit tested without React or the DOM.

/** Wait this long after the last change before writing a backup. */
export const BACKUP_DEBOUNCE_MS = 60 * 1000;

/**
 * Never write backups closer together than this. Matches the desktop app's
 * backup interval; the export re-zips the whole database so keep it coarse.
 */
export const MIN_BACKUP_INTERVAL_MS = 15 * 60 * 1000;

export type BackupDecisionInput = {
  now: number;
  isAllowed: boolean;
  lastBackupAt: number | null;
  lastChangeAt: number | null;
  lastAttemptAt: number | null;
};

/**
 * Returns the delay in milliseconds until the next backup attempt, or null
 * when nothing should be scheduled.
 */
export function getNextBackupDelay({
  now,
  isAllowed,
  lastBackupAt,
  lastChangeAt,
  lastAttemptAt,
}: BackupDecisionInput): number | null {
  if (!isAllowed) {
    return null;
  }

  // `lastBackupAt` is the moment the last backup started, so a change
  // recorded at the same time may not be in it: treat it as pending.
  const hasPendingChanges =
    lastBackupAt === null ||
    (lastChangeAt !== null && lastChangeAt >= lastBackupAt);
  if (!hasPendingChanges) {
    return null;
  }

  const notBefore = Math.max(
    (lastChangeAt ?? now) + BACKUP_DEBOUNCE_MS,
    lastBackupAt === null ? 0 : lastBackupAt + MIN_BACKUP_INTERVAL_MS,
    lastAttemptAt === null ? 0 : lastAttemptAt + MIN_BACKUP_INTERVAL_MS,
  );
  return Math.max(0, notBefore - now);
}

export type BackupSchedulerDeps = {
  isAllowed: () => boolean;
  getLastBackupAt: () => number | null;
  getLastChangeAt: () => number | null;
  setLastChangeAt: (time: number) => void;
  runBackup: () => Promise<unknown>;
  now?: () => number;
  setTimer?: (callback: () => void, delay: number) => unknown;
  clearTimer?: (timer: unknown) => void;
};

export type BackupScheduler = {
  /** Call after every applied change; debounces the next backup. */
  notifyChange: () => void;
  /** Recomputes the timer, e.g. after permission or visibility changes. */
  reevaluate: () => void;
  stop: () => void;
};

export function createBackupScheduler({
  isAllowed,
  getLastBackupAt,
  getLastChangeAt,
  setLastChangeAt,
  runBackup,
  now = () => Date.now(),
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = timer => clearTimeout(timer as ReturnType<typeof setTimeout>),
}: BackupSchedulerDeps): BackupScheduler {
  let timer: unknown = null;
  let lastAttemptAt: number | null = null;
  let isRunning = false;
  let isStopped = false;

  function clearPendingTimer() {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  }

  async function attempt() {
    timer = null;
    if (isRunning || isStopped) {
      return;
    }
    isRunning = true;
    lastAttemptAt = now();
    try {
      await runBackup();
    } finally {
      isRunning = false;
      reevaluate();
    }
  }

  function reevaluate() {
    if (isStopped) {
      return;
    }
    clearPendingTimer();
    if (isRunning) {
      return;
    }
    const delay = getNextBackupDelay({
      now: now(),
      isAllowed: isAllowed(),
      lastBackupAt: getLastBackupAt(),
      lastChangeAt: getLastChangeAt(),
      lastAttemptAt,
    });
    if (delay !== null) {
      timer = setTimer(() => void attempt(), delay);
    }
  }

  return {
    notifyChange() {
      setLastChangeAt(now());
      reevaluate();
    },
    reevaluate,
    stop() {
      isStopped = true;
      clearPendingTimer();
    },
  };
}
