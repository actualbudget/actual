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

  test('removes an orphaned temp file left by a previous crashed write to the same target', async () => {
    const target = path.join(dir, 'metadata.json');
    fsSync.writeFileSync(target, 'original content');
    const orphan = `${target}.12345.deadbeef.tmp`;
    fsSync.writeFileSync(orphan, 'leftover from a crash');

    const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();
    await atomicWriteFile(target, 'new content');

    expect(fsSync.existsSync(orphan)).toBe(false);
  });

  test('does not touch an orphaned temp file belonging to a different target in the same directory', async () => {
    const target = path.join(dir, 'metadata.json');
    const otherTarget = path.join(dir, 'db.sqlite');
    fsSync.writeFileSync(target, 'original content');
    const unrelatedOrphan = `${otherTarget}.99999.cafef00d.tmp`;
    fsSync.writeFileSync(
      unrelatedOrphan,
      'still being written by someone else',
    );

    const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();
    await atomicWriteFile(target, 'new content');

    expect(fsSync.existsSync(unrelatedOrphan)).toBe(true);
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
