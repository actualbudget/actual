import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { preserveMode, sweepOrphanedTempFiles } from './paths';

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
