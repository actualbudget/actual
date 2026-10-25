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
});
