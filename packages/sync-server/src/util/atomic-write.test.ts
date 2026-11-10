import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { atomicWriteFile } from './atomic-write';

describe('atomicWriteFile', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'actual-atomic-test-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const tempFiles = () => fs.readdirSync(dir).filter(f => f.endsWith('.tmp'));

  it('replaces the file and leaves no temp file behind', async () => {
    const target = path.join(dir, 'file-abc.blob');
    fs.writeFileSync(target, 'original');

    await atomicWriteFile(target, Buffer.from('new'));

    expect(fs.readFileSync(target, 'utf8')).toBe('new');
    expect(tempFiles()).toEqual([]);
  });

  it('keeps the original file when the write fails partway through', async () => {
    const target = path.join(dir, 'file-abc.blob');
    fs.writeFileSync(target, 'original');
    vi.spyOn(fsPromises, 'writeFile').mockImplementationOnce(async tmpPath => {
      fs.writeFileSync(tmpPath as fs.PathLike, 'PARTIAL');
      throw new Error('simulated disk failure');
    });

    await expect(atomicWriteFile(target, Buffer.from('new'))).rejects.toThrow(
      'simulated disk failure',
    );

    expect(fs.readFileSync(target, 'utf8')).toBe('original');
    expect(tempFiles()).toEqual([]);
  });

  it('writes through a symlink instead of replacing it', async () => {
    const realTarget = path.join(dir, 'real.blob');
    const symlinkPath = path.join(dir, 'file-abc.blob');
    fs.writeFileSync(realTarget, 'original');
    fs.symlinkSync(realTarget, symlinkPath);

    await atomicWriteFile(symlinkPath, Buffer.from('new'));

    expect(fs.lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
    expect(fs.readFileSync(realTarget, 'utf8')).toBe('new');
  });

  it('creates the target of a dangling symlink instead of replacing it', async () => {
    // A relative link reached through a symlinked directory, so `..` must
    // resolve from the real directory.
    const realDir = path.join(dir, 'actual', 'nested');
    fs.mkdirSync(realDir, { recursive: true });
    fs.symlinkSync(realDir, path.join(dir, 'storage'));
    const symlinkPath = path.join(realDir, 'file-abc.blob');
    fs.symlinkSync(path.join('..', 'file-abc.blob'), symlinkPath);
    fs.writeFileSync(path.join(dir, 'file-abc.blob'), 'unrelated');

    await atomicWriteFile(
      path.join(dir, 'storage', 'file-abc.blob'),
      Buffer.from('new'),
    );

    expect(fs.lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
    expect(
      fs.readFileSync(path.join(dir, 'actual', 'file-abc.blob'), 'utf8'),
    ).toBe('new');
    expect(fs.readFileSync(path.join(dir, 'file-abc.blob'), 'utf8')).toBe(
      'unrelated',
    );
  });

  it(
    'keeps the permissions of the file it replaces',
    { skip: process.platform === 'win32' },
    async () => {
      const target = path.join(dir, 'file-abc.blob');
      fs.writeFileSync(target, 'original');
      // Set after creation, as the umask would strip the group and other
      // write bits.
      fs.chmodSync(target, 0o666);

      await atomicWriteFile(target, Buffer.from('new'));

      expect(fs.statSync(target).mode & 0o777).toBe(0o666);
    },
  );
});
