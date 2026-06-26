import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { acquireExclusive, acquireShared } from './lock';

// In-memory stand-in for proper-lockfile. The real library spins up a
// setTimeout loop to refresh lockfile mtimes; on some CI filesystems that
// timer keeps Node's event loop alive even after tests complete, wedging the
// test run. The mock behaves identically from our wrapper's perspective
// (acquire, detect contention with ELOCKED, release) without touching the
// filesystem or scheduling timers.
const mockHeld = new Set<string>();

vi.mock('proper-lockfile', () => ({
  default: {
    lock: vi.fn(
      async (
        file: string,
        opts?: { lockfilePath?: string },
      ): Promise<() => Promise<void>> => {
        const key = opts?.lockfilePath ?? file;
        if (mockHeld.has(key)) {
          const err = new Error('Lock is already held') as Error & {
            code?: string;
          };
          err.code = 'ELOCKED';
          throw err;
        }
        mockHeld.add(key);
        return async () => {
          mockHeld.delete(key);
        };
      },
    ),
  },
}));

describe('acquireExclusive', () => {
  let dir: string;

  beforeEach(() => {
    mockHeld.clear();
    dir = mkdtempSync(join(tmpdir(), 'actual-cli-lock-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates the directory if it does not exist', async () => {
    const target = join(dir, 'nested', 'budget');
    const release = await acquireExclusive(target, { timeoutMs: 1000 });
    expect(existsSync(target)).toBe(true);
    await release();
  });

  it('returns a release function that frees the lock', async () => {
    const release1 = await acquireExclusive(dir, { timeoutMs: 1000 });
    await release1();
    const release2 = await acquireExclusive(dir, { timeoutMs: 1000 });
    await release2();
  });

  it('rejects with a user-friendly error when another holder has the lock', async () => {
    const release = await acquireExclusive(dir, { timeoutMs: 1000 });
    await expect(acquireExclusive(dir, { timeoutMs: 100 })).rejects.toThrow(
      /holding the budget/,
    );
    await release();
  });
});

describe('acquireShared', () => {
  let dir: string;

  beforeEach(() => {
    mockHeld.clear();
    dir = mkdtempSync(join(tmpdir(), 'actual-cli-lock-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('allows multiple concurrent shared holders', async () => {
    const r1 = await acquireShared(dir, { timeoutMs: 1000 });
    const r2 = await acquireShared(dir, { timeoutMs: 1000 });
    const readers = readdirSync(join(dir, 'readers'));
    expect(readers).toHaveLength(2);
    await r1();
    await r2();
  });

  it('removes the reader marker on release', async () => {
    const release = await acquireShared(dir, { timeoutMs: 1000 });
    await release();
    const readers = readdirSync(join(dir, 'readers'));
    expect(readers).toHaveLength(0);
  });

  it('rejects when an exclusive lock is held', async () => {
    const releaseExclusive = await acquireExclusive(dir, { timeoutMs: 1000 });
    await expect(acquireShared(dir, { timeoutMs: 100 })).rejects.toThrow(
      /holding the budget/,
    );
    await releaseExclusive();
  });

  it('sweeps stale reader markers whose PIDs no longer exist', async () => {
    const readersDir = join(dir, 'readers');
    mkdirSync(readersDir, { recursive: true });
    writeFileSync(join(readersDir, '-1-abc'), '');

    const release = await acquireExclusive(dir, { timeoutMs: 1000 });
    expect(readdirSync(readersDir)).toHaveLength(0);
    await release();
  });
});

describe('writer-reader interaction', () => {
  let dir: string;

  beforeEach(() => {
    mockHeld.clear();
    dir = mkdtempSync(join(tmpdir(), 'actual-cli-lock-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('exclusive waits for active shared holders to release', async () => {
    const readerRelease = await acquireShared(dir, { timeoutMs: 500 });

    let writerAcquired = false;
    const writerPromise = acquireExclusive(dir, { timeoutMs: 1000 }).then(
      release => {
        writerAcquired = true;
        return release;
      },
    );

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(writerAcquired).toBe(false);

    await readerRelease();
    const writerRelease = await writerPromise;
    expect(writerAcquired).toBe(true);
    await writerRelease();
  });
});
