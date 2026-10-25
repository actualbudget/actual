import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { atomicWriteFile } from './atomic-write';

// Skips the lock-retry backoff delays while letting real file I/O complete.
async function settle(promise: Promise<void>) {
  let isSettled = false;
  promise.then(
    () => (isSettled = true),
    () => (isSettled = true),
  );
  while (!isSettled) {
    await new Promise(resolve => setImmediate(resolve));
    await vi.advanceTimersByTimeAsync(500);
  }
  return promise;
}

describe('atomicWriteFile', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'actual-fs-test-'));
    vi.useFakeTimers({ toFake: ['setTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const tempFiles = () => fs.readdirSync(dir).filter(f => f.endsWith('.tmp'));

  test('replaces the contents and leaves no temp file behind', async () => {
    const target = path.join(dir, 'db.sqlite');
    fs.writeFileSync(target, 'original');
    const bytes = new Uint8Array([0x00, 0xff, 0x53, 0x51, 0x4c, 0x80]);

    await atomicWriteFile(target, bytes);

    expect(new Uint8Array(fs.readFileSync(target))).toEqual(bytes);
    expect(tempFiles()).toEqual([]);
  });

  test('keeps the original file when the write fails partway through', async () => {
    const target = path.join(dir, 'metadata.json');
    fs.writeFileSync(target, 'original');
    vi.spyOn(fs.promises, 'writeFile').mockImplementation(async tmpPath => {
      fs.writeFileSync(tmpPath as fs.PathLike, 'PARTIAL');
      throw new Error('simulated disk failure');
    });

    await expect(settle(atomicWriteFile(target, 'new'))).rejects.toThrow(
      'simulated disk failure',
    );

    expect(fs.readFileSync(target, 'utf8')).toBe('original');
    expect(tempFiles()).toEqual([]);
  });

  test('recovers when the file is locked only briefly', async () => {
    const target = path.join(dir, 'metadata.json');
    vi.spyOn(fs.promises, 'writeFile').mockRejectedValueOnce(
      Object.assign(new Error('resource busy or locked'), { code: 'EBUSY' }),
    );

    await settle(atomicWriteFile(target, 'new'));

    expect(fs.readFileSync(target, 'utf8')).toBe('new');
  });

  test('writes through a symlink instead of replacing it', async () => {
    const realTarget = path.join(dir, 'real-metadata.json');
    const symlinkPath = path.join(dir, 'metadata.json');
    fs.writeFileSync(realTarget, 'original');
    fs.symlinkSync(realTarget, symlinkPath);

    await atomicWriteFile(symlinkPath, 'new');

    expect(fs.lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
    expect(fs.readFileSync(realTarget, 'utf8')).toBe('new');
  });

  test('creates the target of a dangling symlink instead of replacing it', async () => {
    // A relative link reached through a symlinked directory, so `..` must
    // resolve from the real directory.
    const realDir = path.join(dir, 'actual', 'nested');
    fs.mkdirSync(realDir, { recursive: true });
    fs.symlinkSync(realDir, path.join(dir, 'storage'));
    const symlinkPath = path.join(realDir, 'metadata.json');
    fs.symlinkSync(path.join('..', 'metadata.json'), symlinkPath);
    fs.writeFileSync(path.join(dir, 'metadata.json'), 'unrelated');

    await atomicWriteFile(path.join(dir, 'storage', 'metadata.json'), 'new');

    expect(fs.lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
    expect(
      fs.readFileSync(path.join(dir, 'actual', 'metadata.json'), 'utf8'),
    ).toBe('new');
    expect(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf8')).toBe(
      'unrelated',
    );
  });

  test(
    'keeps the permissions of the file it replaces',
    { skip: process.platform === 'win32' },
    async () => {
      const target = path.join(dir, 'metadata.json');
      fs.writeFileSync(target, 'original');
      // Set after creation, as the umask would strip the group and other
      // write bits.
      fs.chmodSync(target, 0o666);

      await atomicWriteFile(target, 'new');

      expect(fs.statSync(target).mode & 0o777).toBe(0o666);
    },
  );
});
