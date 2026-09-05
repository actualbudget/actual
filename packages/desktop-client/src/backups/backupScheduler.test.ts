import {
  BACKUP_DEBOUNCE_MS,
  createBackupScheduler,
  getNextBackupDelay,
  MIN_BACKUP_INTERVAL_MS,
} from './backupScheduler';

const NOW = 1_000_000_000;

describe('getNextBackupDelay', () => {
  it('schedules nothing when access is not granted', () => {
    expect(
      getNextBackupDelay({
        now: NOW,
        isAllowed: false,
        lastBackupAt: null,
        lastChangeAt: NOW,
        lastAttemptAt: null,
      }),
    ).toBeNull();
  });

  it('waits the debounce before the very first backup', () => {
    expect(
      getNextBackupDelay({
        now: NOW,
        isAllowed: true,
        lastBackupAt: null,
        lastChangeAt: null,
        lastAttemptAt: null,
      }),
    ).toBe(BACKUP_DEBOUNCE_MS);
  });

  it('schedules nothing when there are no changes since the last backup', () => {
    expect(
      getNextBackupDelay({
        now: NOW,
        isAllowed: true,
        lastBackupAt: NOW - 1000,
        lastChangeAt: NOW - 5000,
        lastAttemptAt: null,
      }),
    ).toBeNull();
  });

  it('debounces after a change', () => {
    expect(
      getNextBackupDelay({
        now: NOW,
        isAllowed: true,
        lastBackupAt: NOW - 2 * MIN_BACKUP_INTERVAL_MS,
        lastChangeAt: NOW - 10_000,
        lastAttemptAt: null,
      }),
    ).toBe(BACKUP_DEBOUNCE_MS - 10_000);
  });

  it('enforces the minimum interval since the last backup', () => {
    const lastBackupAt = NOW - 5 * 60 * 1000;
    expect(
      getNextBackupDelay({
        now: NOW,
        isAllowed: true,
        lastBackupAt,
        lastChangeAt: NOW - 2 * BACKUP_DEBOUNCE_MS,
        lastAttemptAt: null,
      }),
    ).toBe(lastBackupAt + MIN_BACKUP_INTERVAL_MS - NOW);
  });

  it('backs off after a failed attempt', () => {
    const lastAttemptAt = NOW - 60_000;
    expect(
      getNextBackupDelay({
        now: NOW,
        isAllowed: true,
        lastBackupAt: null,
        lastChangeAt: NOW - 10 * BACKUP_DEBOUNCE_MS,
        lastAttemptAt,
      }),
    ).toBe(lastAttemptAt + MIN_BACKUP_INTERVAL_MS - NOW);
  });

  it('never returns a negative delay', () => {
    expect(
      getNextBackupDelay({
        now: NOW,
        isAllowed: true,
        lastBackupAt: NOW - 10 * MIN_BACKUP_INTERVAL_MS,
        lastChangeAt: NOW - 10 * BACKUP_DEBOUNCE_MS,
        lastAttemptAt: null,
      }),
    ).toBe(0);
  });
});

describe('createBackupScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup({ isAllowed = true } = {}) {
    let currentTime = NOW;
    let lastBackupAt: number | null = null;
    let lastChangeAt: number | null = null;
    const runBackup = vi.fn(async () => {
      lastBackupAt = currentTime;
    });

    const scheduler = createBackupScheduler({
      isAllowed: () => isAllowed,
      getLastBackupAt: () => lastBackupAt,
      getLastChangeAt: () => lastChangeAt,
      setLastChangeAt: time => {
        lastChangeAt = time;
      },
      runBackup,
      now: () => currentTime,
    });

    async function advance(ms: number) {
      currentTime += ms;
      await vi.advanceTimersByTimeAsync(ms);
    }

    return {
      scheduler,
      runBackup,
      advance,
      getLastBackupAt: () => lastBackupAt,
    };
  }

  it('coalesces a burst of changes into one backup', async () => {
    const { scheduler, runBackup, advance } = setup();
    scheduler.reevaluate();
    await advance(BACKUP_DEBOUNCE_MS);
    expect(runBackup).toHaveBeenCalledTimes(1);

    scheduler.notifyChange();
    await advance(1000);
    scheduler.notifyChange();
    await advance(1000);
    scheduler.notifyChange();
    expect(runBackup).toHaveBeenCalledTimes(1);

    await advance(MIN_BACKUP_INTERVAL_MS);
    expect(runBackup).toHaveBeenCalledTimes(2);
  });

  it('does not back up more often than the minimum interval', async () => {
    const { scheduler, runBackup, advance } = setup();
    scheduler.reevaluate();
    await advance(BACKUP_DEBOUNCE_MS);
    expect(runBackup).toHaveBeenCalledTimes(1);

    scheduler.notifyChange();
    await advance(MIN_BACKUP_INTERVAL_MS / 2);
    expect(runBackup).toHaveBeenCalledTimes(1);

    await advance(MIN_BACKUP_INTERVAL_MS / 2);
    expect(runBackup).toHaveBeenCalledTimes(2);
  });

  it('does nothing while access is not granted', async () => {
    const { scheduler, runBackup, advance } = setup({ isAllowed: false });
    scheduler.reevaluate();
    scheduler.notifyChange();
    await advance(10 * MIN_BACKUP_INTERVAL_MS);
    expect(runBackup).not.toHaveBeenCalled();
  });

  it('retries a failed backup only after the interval', async () => {
    let currentTime = NOW;
    let lastChangeAt: number | null = null;
    const runBackup = vi.fn(async () => {
      // Never records a successful backup
    });
    const scheduler = createBackupScheduler({
      isAllowed: () => true,
      getLastBackupAt: () => null,
      getLastChangeAt: () => lastChangeAt,
      setLastChangeAt: time => {
        lastChangeAt = time;
      },
      runBackup,
      now: () => currentTime,
    });

    scheduler.reevaluate();
    currentTime += BACKUP_DEBOUNCE_MS;
    await vi.advanceTimersByTimeAsync(BACKUP_DEBOUNCE_MS);
    expect(runBackup).toHaveBeenCalledTimes(1);

    currentTime += MIN_BACKUP_INTERVAL_MS / 2;
    await vi.advanceTimersByTimeAsync(MIN_BACKUP_INTERVAL_MS / 2);
    expect(runBackup).toHaveBeenCalledTimes(1);

    currentTime += MIN_BACKUP_INTERVAL_MS / 2;
    await vi.advanceTimersByTimeAsync(MIN_BACKUP_INTERVAL_MS / 2);
    expect(runBackup).toHaveBeenCalledTimes(2);
  });

  it('stops firing after stop()', async () => {
    const { scheduler, runBackup, advance } = setup();
    scheduler.reevaluate();
    scheduler.stop();
    await advance(10 * MIN_BACKUP_INTERVAL_MS);
    expect(runBackup).not.toHaveBeenCalled();
  });
});
