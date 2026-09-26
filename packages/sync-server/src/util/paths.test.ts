import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { config } from '#load-config';

import {
  atomicWriteUserFile,
  getPathForUserFile,
  preserveMode,
  sweepOrphanedTempFiles,
} from './paths';
import type { FileId } from './paths';

describe('getPathForUserFile', () => {
  it('builds the blob path inside the user files directory', () => {
    const userFilesDir = path.resolve(config.get('userFiles'));

    expect(getPathForUserFile('abc-123' as FileId)).toBe(
      path.join(userFilesDir, 'file-abc-123.blob'),
    );
  });

  it('rejects an id that would escape the user files directory', () => {
    // Cast past the branded type: this id would fail isValidFileId, and the
    // point is that the path builder refuses it even if a caller skips that.
    expect(() => getPathForUserFile('x/../../escape' as FileId)).toThrow(
      'Invalid file id',
    );
  });
});

describe('sweepOrphanedTempFiles', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'actual-sweep-test-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('removes leftover upload temp files for any file in the directory', async () => {
    const orphan = path.join(dir, 'file-abc.blob.12345-deadbeef.tmp');
    fs.writeFileSync(orphan, 'leftover from a crash');

    await sweepOrphanedTempFiles(dir, new Set());

    expect(fs.existsSync(orphan)).toBe(false);
  });

  it('leaves temp files it did not create alone', async () => {
    const unrelated = path.join(dir, 'something-else.tmp');
    fs.writeFileSync(unrelated, 'not ours');

    await sweepOrphanedTempFiles(dir, new Set());

    expect(fs.existsSync(unrelated)).toBe(true);
  });

  it('skips temp files for uploads that are still in progress', async () => {
    const inFlight = path.join(dir, 'file-abc.blob.12345-deadbeef.tmp');
    fs.writeFileSync(inFlight, 'upload in progress');

    await sweepOrphanedTempFiles(dir, new Set([inFlight]));

    expect(fs.existsSync(inFlight)).toBe(true);
  });

  it('lists a directory only the first time it is swept', async () => {
    const readdirSpy = vi.spyOn(fsPromises, 'readdir');

    await sweepOrphanedTempFiles(dir, new Set());
    await sweepOrphanedTempFiles(dir, new Set());

    expect(readdirSpy).toHaveBeenCalledTimes(1);
  });
});

describe('preserveMode', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'actual-mode-test-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('does not throw when the filesystem refuses to change permissions', async () => {
    const target = path.join(dir, 'file-abc.blob');
    const tmpPath = `${target}.12345-deadbeef.tmp`;
    fs.writeFileSync(target, 'original');
    fs.writeFileSync(tmpPath, 'new');
    vi.spyOn(fsPromises, 'chmod').mockRejectedValueOnce(
      Object.assign(new Error('operation not permitted'), { code: 'EPERM' }),
    );

    await expect(preserveMode(tmpPath, target)).resolves.toBeUndefined();
  });
});

describe('atomicWriteUserFile', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'actual-atomic-test-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('replaces the file and leaves no temp file behind', async () => {
    const target = path.join(dir, 'file-abc.blob');
    fs.writeFileSync(target, 'original');

    await atomicWriteUserFile(target, Buffer.from('new content'));

    expect(fs.readFileSync(target, 'utf8')).toBe('new content');
    expect(fs.readdirSync(dir).filter(f => f.endsWith('.tmp'))).toEqual([]);
  });

  it('writes through a symlink instead of replacing it', async () => {
    const realTarget = path.join(dir, 'real.blob');
    const symlinkPath = path.join(dir, 'file-abc.blob');
    fs.writeFileSync(realTarget, 'original');
    fs.symlinkSync(realTarget, symlinkPath);

    await atomicWriteUserFile(symlinkPath, Buffer.from('new content'));

    expect(fs.lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
    expect(fs.readFileSync(realTarget, 'utf8')).toBe('new content');
  });

  it('creates the missing file behind a dangling symlink instead of replacing the link', async () => {
    const missingTarget = path.join(dir, 'real.blob');
    const symlinkPath = path.join(dir, 'file-abc.blob');
    fs.symlinkSync(missingTarget, symlinkPath);

    await atomicWriteUserFile(symlinkPath, Buffer.from('new content'));

    expect(fs.lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
    expect(fs.readFileSync(missingTarget, 'utf8')).toBe('new content');
  });

  it('puts the temp file next to the real target, not the symlink', async () => {
    const realDir = path.join(dir, 'elsewhere');
    fs.mkdirSync(realDir);
    const realTarget = path.join(realDir, 'real.blob');
    const symlinkPath = path.join(dir, 'file-abc.blob');
    fs.writeFileSync(realTarget, 'original');
    fs.symlinkSync(realTarget, symlinkPath);

    const writeFileSpy = vi.spyOn(fsPromises, 'writeFile');
    onTestFinished(() => writeFileSpy.mockRestore());

    await atomicWriteUserFile(symlinkPath, Buffer.from('new content'));

    const tmpPath = String(writeFileSpy.mock.calls[0][0]);
    expect(path.dirname(tmpPath)).toBe(fs.realpathSync(realDir));
    expect(fs.readFileSync(realTarget, 'utf8')).toBe('new content');
  });
});
