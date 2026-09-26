import * as fsSync from 'fs';
import * as os from 'os';
import * as path from 'path';

// `mocks/setup.ts` (a global vitest setupFile) already imports
// `#platform/server/fs` transitively, which now pulls in `./atomic-write`
// before this file's module code runs, so a module-level `vi.mock('#shared/retry', ...)`
// would bind too late. Force a fresh, isolated load after registering the mock.
async function loadAtomicWriteFileWithFastRetry() {
  vi.resetModules();
  vi.doMock('#shared/retry', () => ({
    // Fail fast in tests instead of exercising the real exponential backoff -
    // the retry loop itself is a separate concern from what's under test here.
    retry: (
      fn: (retry: (err: unknown) => void, attempt: number) => Promise<unknown>,
    ) =>
      fn(err => {
        throw err;
      }, 1),
  }));

  const { atomicWriteFile } = await import('./atomic-write');
  return { atomicWriteFile };
}

// A promise the test can resolve from elsewhere, to sequence concurrent writes.
function createSignal() {
  let resolveReached: () => void = () => undefined;
  const reached = new Promise<void>(resolve => {
    resolveReached = resolve;
  });
  return { reached, signal: () => resolveReached() };
}

describe('resolveWriteTarget', () => {
  let dir: string;

  beforeEach(() => {
    dir = fsSync.mkdtempSync(path.join(os.tmpdir(), 'actual-fs-test-'));
  });

  afterEach(() => {
    fsSync.rmSync(dir, { recursive: true, force: true });
  });

  test('returns the path unchanged when nothing on it is a symlink', async () => {
    const { resolveWriteTarget } = await import('./atomic-write');
    const target = path.join(dir, 'metadata.json');
    fsSync.writeFileSync(target, 'content');

    await expect(resolveWriteTarget(target)).resolves.toBe(target);
  });

  test('resolves a symlinked target to its real path', async () => {
    const { resolveWriteTarget } = await import('./atomic-write');
    const realTarget = path.join(dir, 'real-metadata.json');
    const symlinkTarget = path.join(dir, 'metadata.json');
    fsSync.writeFileSync(realTarget, 'content');
    fsSync.symlinkSync(realTarget, symlinkTarget);

    await expect(resolveWriteTarget(symlinkTarget)).resolves.toBe(
      await fsSync.promises.realpath(realTarget),
    );
  });

  test('resolves a new file under a symlinked directory to the real directory', async () => {
    const { resolveWriteTarget } = await import('./atomic-write');
    const realDir = path.join(dir, 'real-dir');
    fsSync.mkdirSync(realDir);
    const symlinkDir = path.join(dir, 'symlink-dir');
    fsSync.symlinkSync(realDir, symlinkDir);

    const newFileViaSymlink = path.join(symlinkDir, 'metadata.json');
    const expected = path.join(
      await fsSync.promises.realpath(realDir),
      'metadata.json',
    );

    await expect(resolveWriteTarget(newFileViaSymlink)).resolves.toBe(expected);
  });

  test('rejects a symlink loop instead of following it forever', async () => {
    const { resolveWriteTarget } = await import('./atomic-write');
    const a = path.join(dir, 'a.json');
    const b = path.join(dir, 'b.json');
    fsSync.symlinkSync(b, a);
    fsSync.symlinkSync(a, b);

    await expect(resolveWriteTarget(a)).rejects.toMatchObject({
      code: 'ELOOP',
    });
  });

  test('resolves a symlink whose target does not exist yet to that target', async () => {
    const { resolveWriteTarget } = await import('./atomic-write');
    const missingTarget = path.join(dir, 'real-metadata.json');
    const symlinkPath = path.join(dir, 'metadata.json');
    fsSync.symlinkSync(missingTarget, symlinkPath);

    await expect(resolveWriteTarget(symlinkPath)).resolves.toBe(
      path.join(await fsSync.promises.realpath(dir), 'real-metadata.json'),
    );
  });
});

describe('atomicWriteFile', () => {
  let dir: string;

  beforeEach(() => {
    dir = fsSync.mkdtempSync(path.join(os.tmpdir(), 'actual-fs-test-'));
  });

  afterEach(() => {
    fsSync.rmSync(dir, { recursive: true, force: true });
    vi.resetModules();
    vi.doUnmock('#shared/retry');
    vi.restoreAllMocks();
  });

  test('does not corrupt the existing file when the write fails partway through', async () => {
    const target = path.join(dir, 'metadata.json');
    fsSync.writeFileSync(target, 'original good content');

    const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();
    vi.spyOn(fsSync.promises, 'writeFile').mockImplementationOnce(
      async tmpPath => {
        fsSync.writeFileSync(tmpPath as fsSync.PathLike, 'PARTIAL-GARBAGE');
        throw new Error('simulated disk failure');
      },
    );

    await expect(atomicWriteFile(target, 'new content')).rejects.toThrow();
    expect(fsSync.readFileSync(target, 'utf8')).toBe('original good content');
  });

  test('does not sweep the temp file of an in-flight write to the same target', async () => {
    const target = path.join(dir, 'metadata.json');
    fsSync.writeFileSync(target, 'original content');

    const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();
    const realWriteFile = fsSync.promises.writeFile;
    // Pause the first write after its temp file lands on disk, and run a
    // second write to the same target to completion inside that window.
    vi.spyOn(fsSync.promises, 'writeFile').mockImplementationOnce(
      async (...args: Parameters<typeof realWriteFile>) => {
        await realWriteFile(...args);
        await atomicWriteFile(target, 'second write');
      },
    );

    await expect(
      atomicWriteFile(target, 'first write'),
    ).resolves.toBeUndefined();
    expect(fsSync.readFileSync(target, 'utf8')).toBe('first write');
  });

  test('still writes when the filesystem refuses to change permissions', async () => {
    const target = path.join(dir, 'metadata.json');
    fsSync.writeFileSync(target, 'original content');

    const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();
    vi.spyOn(fsSync.promises, 'chmod').mockRejectedValueOnce(
      Object.assign(new Error('operation not permitted'), { code: 'EPERM' }),
    );

    await atomicWriteFile(target, 'new content');

    expect(fsSync.readFileSync(target, 'utf8')).toBe('new content');
  });

  test('creates the missing file behind a dangling symlink instead of replacing the link', async () => {
    const missingTarget = path.join(dir, 'real-metadata.json');
    const symlinkPath = path.join(dir, 'metadata.json');
    fsSync.symlinkSync(missingTarget, symlinkPath);

    const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();
    await atomicWriteFile(symlinkPath, 'new content');

    expect(fsSync.lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
    expect(fsSync.readFileSync(missingTarget, 'utf8')).toBe('new content');
  });

  test('writes through a symlink instead of replacing it', async () => {
    const realTarget = path.join(dir, 'real-metadata.json');
    const symlinkTarget = path.join(dir, 'metadata.json');
    fsSync.writeFileSync(realTarget, 'original content');
    fsSync.symlinkSync(realTarget, symlinkTarget);

    const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();
    await atomicWriteFile(symlinkTarget, 'new content');

    expect(fsSync.lstatSync(symlinkTarget).isSymbolicLink()).toBe(true);
    expect(fsSync.readFileSync(realTarget, 'utf8')).toBe('new content');
  });

  test.skipIf(process.platform === 'win32')(
    'preserves the original file permission mode',
    async () => {
      const target = path.join(dir, 'metadata.json');
      fsSync.writeFileSync(target, 'original content', { mode: 0o600 });

      const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();
      await atomicWriteFile(target, 'new content');

      const mode = fsSync.statSync(target).mode & 0o777;
      expect(mode).toBe(0o600);
    },
  );

  test.skipIf(process.platform === 'win32')(
    'never exposes the new contents with a wider mode than the original',
    async () => {
      const target = path.join(dir, 'metadata.json');
      fsSync.writeFileSync(target, 'original content', { mode: 0o600 });

      const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();
      const realWriteFile = fsSync.promises.writeFile;
      let modeWhenWritten: number | undefined;
      vi.spyOn(fsSync.promises, 'writeFile').mockImplementationOnce(
        async (...args: Parameters<typeof realWriteFile>) => {
          await realWriteFile(...args);
          modeWhenWritten = fsSync.statSync(args[0] as fsSync.PathLike).mode;
        },
      );

      await atomicWriteFile(target, 'new content');

      expect((modeWhenWritten ?? 0) & 0o777).toBe(0o600);
    },
  );

  test('flushes the temp file to disk before renaming it into place', async () => {
    const target = path.join(dir, 'metadata.json');
    const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();
    const writeFileSpy = vi.spyOn(fsSync.promises, 'writeFile');

    await atomicWriteFile(target, 'new content');

    expect(writeFileSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\.tmp$/),
      'new content',
      expect.objectContaining({ flush: true }),
    );
  });

  test('removes an orphaned temp file left by a previous crashed write to the same target', async () => {
    const target = path.join(dir, 'metadata.json');
    fsSync.writeFileSync(target, 'original content');
    const orphan = `${target}.12345.deadbeef.tmp`;
    fsSync.writeFileSync(orphan, 'leftover from a crash');

    const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();
    await atomicWriteFile(target, 'new content');

    expect(fsSync.existsSync(orphan)).toBe(false);
  });

  test('removes an orphaned temp file left for a different file in the same directory', async () => {
    // e.g. a timestamped backup that is never written again under that name
    const target = path.join(dir, 'metadata.json');
    const orphan = path.join(dir, '2026-09-25_12-00-00.zip.12345.deadbeef.tmp');
    fsSync.writeFileSync(orphan, 'leftover from a crash');

    const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();
    await atomicWriteFile(target, 'new content');

    expect(fsSync.existsSync(orphan)).toBe(false);
  });

  test('leaves temp files that atomicWriteFile did not create alone', async () => {
    // The backup service stages the database under this name while zipping it.
    const backupStaging = path.join(dir, 'db.1727287200000.sqlite.tmp');
    fsSync.writeFileSync(backupStaging, 'backup in progress');

    const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();
    await atomicWriteFile(path.join(dir, 'metadata.json'), 'new content');

    expect(fsSync.existsSync(backupStaging)).toBe(true);
  });

  test('does not sweep the temp file of a write that started during the sweep', async () => {
    const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();
    const realReaddir = fsSync.promises.readdir;
    const realWriteFile = fsSync.promises.writeFile;

    const sweepStarted = createSignal();
    const secondTempWritten = createSignal();

    // Hold the first write's directory listing open until the second write's
    // temp file is on disk, so the listing includes it.
    vi.spyOn(fsSync.promises, 'readdir').mockImplementationOnce(
      async (...args: Parameters<typeof realReaddir>) => {
        sweepStarted.signal();
        await secondTempWritten.reached;
        return realReaddir(...args);
      },
    );
    const firstWrite = atomicWriteFile(path.join(dir, 'metadata.json'), 'one');
    await sweepStarted.reached;

    // Keep the second write in flight until the first write has finished.
    vi.spyOn(fsSync.promises, 'writeFile').mockImplementationOnce(
      async (...args: Parameters<typeof realWriteFile>) => {
        await realWriteFile(...args);
        secondTempWritten.signal();
        await firstWrite;
      },
    );
    const secondWrite = atomicWriteFile(path.join(dir, 'prefs.json'), 'two');

    await expect(firstWrite).resolves.toBeUndefined();
    await expect(secondWrite).resolves.toBeUndefined();
    expect(fsSync.readFileSync(path.join(dir, 'prefs.json'), 'utf8')).toBe(
      'two',
    );
  });

  test('lists a directory for leftovers only on the first write into it', async () => {
    const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();
    const readdirSpy = vi.spyOn(fsSync.promises, 'readdir');

    await atomicWriteFile(path.join(dir, 'metadata.json'), 'one');
    await atomicWriteFile(path.join(dir, 'prefs.json'), 'two');

    expect(readdirSpy).toHaveBeenCalledTimes(1);
  });

  test('a successful write leaves no temp file behind', async () => {
    const target = path.join(dir, 'metadata.json');
    const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();

    await atomicWriteFile(target, 'new content');

    expect(fsSync.readFileSync(target, 'utf8')).toBe('new content');
    const leftovers = fsSync.readdirSync(dir).filter(f => f.endsWith('.tmp'));
    expect(leftovers).toEqual([]);
  });
});

describe('atomicWriteFile lock retries', () => {
  let dir: string;

  beforeEach(() => {
    dir = fsSync.mkdtempSync(path.join(os.tmpdir(), 'actual-fs-test-'));
    vi.useFakeTimers({ toFake: ['setTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    fsSync.rmSync(dir, { recursive: true, force: true });
    vi.resetModules();
    vi.restoreAllMocks();
  });

  async function loadAtomicWriteFileWithRealRetry() {
    vi.resetModules();
    vi.doUnmock('#shared/retry');
    const { atomicWriteFile } = await import('./atomic-write');
    return { atomicWriteFile };
  }

  // Skips the real backoff delays while letting real file I/O complete.
  // Keeps advancing until the write settles rather than for a fixed number of
  // turns: on a slow machine the real I/O can outlast any fixed budget, and a
  // backoff timer scheduled after the loop gives up would never fire. A
  // genuine hang still fails on the test timeout.
  async function settleWithFakeTimers(promise: Promise<void>) {
    let isSettled = false;
    const tracked = promise.finally(() => {
      isSettled = true;
    });
    tracked.catch(() => undefined);
    while (!isSettled) {
      await new Promise(resolve => setImmediate(resolve));
      await vi.advanceTimersByTimeAsync(500);
    }
    return tracked;
  }

  const fileLocked = () =>
    Object.assign(new Error('resource busy or locked'), { code: 'EBUSY' });

  test('recovers when the file is locked only briefly', async () => {
    const target = path.join(dir, 'metadata.json');
    const { atomicWriteFile } = await loadAtomicWriteFileWithRealRetry();
    const writeFileSpy = vi
      .spyOn(fsSync.promises, 'writeFile')
      .mockRejectedValueOnce(fileLocked());

    await settleWithFakeTimers(atomicWriteFile(target, 'new content'));

    expect(writeFileSpy).toHaveBeenCalledTimes(2);
    expect(fsSync.readFileSync(target, 'utf8')).toBe('new content');
  });

  test('gives up after 20 retries and leaves no temp file behind', async () => {
    const target = path.join(dir, 'metadata.json');
    const { atomicWriteFile } = await loadAtomicWriteFileWithRealRetry();
    const writeFileSpy = vi
      .spyOn(fsSync.promises, 'writeFile')
      .mockRejectedValue(fileLocked());

    await expect(
      settleWithFakeTimers(atomicWriteFile(target, 'new content')),
    ).rejects.toMatchObject({ code: 'EBUSY' });

    expect(writeFileSpy).toHaveBeenCalledTimes(21);
    const leftovers = fsSync.readdirSync(dir).filter(f => f.endsWith('.tmp'));
    expect(leftovers).toEqual([]);
  });
});
