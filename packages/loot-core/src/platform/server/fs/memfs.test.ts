import { describe, expect, it } from 'vitest';

import { MemFs } from './memfs';

describe('MemFs', () => {
  it('creates directories and lists children', () => {
    const fs = new MemFs();
    fs.mkdirp('/documents/Actual/budget');
    fs.writeFile('/documents/Actual/budget/metadata.json', '{}');
    fs.writeFile('/documents/Actual/budget/db.sqlite', null);
    fs.writeFile('/uploads/file.csv', new Uint8Array([1, 2, 3]));

    expect(fs.readdir('/')).toEqual(
      expect.arrayContaining(['documents', 'uploads']),
    );
    expect(fs.readdir('/documents/Actual')).toEqual(['budget']);
    expect(fs.readdir('/documents/Actual/budget').sort()).toEqual([
      'db.sqlite',
      'metadata.json',
    ]);
    expect(fs.isDirectory('/documents/Actual')).toBe(true);
    expect(fs.isFile('/documents/Actual/budget/db.sqlite')).toBe(true);
    expect(fs.readFile('/documents/Actual/budget/db.sqlite')).toBe(null);
    expect(fs.readFile('/missing')).toBe(undefined);
  });

  it('refuses to remove a non-empty directory and removes empty ones', () => {
    const fs = new MemFs();
    fs.writeFile('/a/b/c.txt', 'x');
    expect(() => fs.rmdir('/a/b')).toThrow(/not empty/);
    fs.unlink('/a/b/c.txt');
    fs.rmdir('/a/b');
    expect(fs.exists('/a/b')).toBe(false);
    expect(fs.exists('/a')).toBe(true);
  });

  it('requires a parent directory for mkdir and tolerates trailing slashes', () => {
    const fs = new MemFs();
    expect(() => fs.mkdir('/x/y')).toThrow(/parent/);
    fs.mkdir('/x');
    fs.mkdir('/x/y/');
    expect(fs.exists('/x/y')).toBe(true);
  });
});
