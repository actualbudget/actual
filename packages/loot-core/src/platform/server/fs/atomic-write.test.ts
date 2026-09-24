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

  test('a successful write leaves no temp file behind', async () => {
    const target = path.join(dir, 'metadata.json');
    const { atomicWriteFile } = await loadAtomicWriteFileWithFastRetry();

    await atomicWriteFile(target, 'new content');

    expect(fsSync.readFileSync(target, 'utf8')).toBe('new content');
    const leftovers = fsSync.readdirSync(dir).filter(f => f.endsWith('.tmp'));
    expect(leftovers).toEqual([]);
  });
});
