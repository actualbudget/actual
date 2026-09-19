import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as asyncStorage from '#platform/server/asyncStorage';

// Under the test config `#platform/server/asyncStorage` resolves to the
// electron implementation, but it is globally mocked with an in-memory store in
// the test setup. Undo that so we exercise the real on-disk persistence logic.
vi.unmock('#platform/server/asyncStorage');

let dataDir: string;
const storePath = () => path.join(dataDir, 'global-store.json');

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actual-global-store-'));
  process.env.ACTUAL_DATA_DIR = dataDir;
});

afterEach(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
  delete process.env.ACTUAL_DATA_DIR;
});

describe('electron asyncStorage', () => {
  it('persists values as valid JSON and reads them back', async () => {
    asyncStorage.init();
    await asyncStorage.setItem('language', 'en');

    // The on-disk file is complete, valid JSON.
    const raw = fs.readFileSync(storePath(), 'utf8');
    expect(JSON.parse(raw)).toEqual({ language: 'en' });

    // A fresh init reads the persisted value.
    asyncStorage.init();
    expect(await asyncStorage.getItem('language')).toBe('en');
  });

  it('does not leave temp files behind after a write', async () => {
    asyncStorage.init();
    await asyncStorage.setItem('language', 'en');
    await asyncStorage.setItem('theme', 'dark');

    const leftovers = fs
      .readdirSync(dataDir)
      .filter(name => name.endsWith('.tmp'));
    expect(leftovers).toEqual([]);
  });

  it('keeps the store valid under concurrent writes', async () => {
    asyncStorage.init();

    await Promise.all([
      asyncStorage.setItem('language', 'en'),
      asyncStorage.setItem('theme', 'dark'),
      asyncStorage.multiSet([
        ['max-months', '3'],
        ['floating-sidebar', 'true'],
      ]),
    ]);

    // The file is complete, valid JSON, retains every key (no write clobbered
    // another), and leaves no temp files behind.
    expect(JSON.parse(fs.readFileSync(storePath(), 'utf8'))).toEqual({
      language: 'en',
      theme: 'dark',
      'max-months': '3',
      'floating-sidebar': 'true',
    });
    expect(
      fs.readdirSync(dataDir).filter(name => name.endsWith('.tmp')),
    ).toEqual([]);
  });

  it('falls back to writing in place when the rename crosses filesystems', async () => {
    // Sandboxed installs (e.g. the Microsoft Store package) virtualise the
    // app data folder, so the temp-file rename fails with EXDEV.
    const crossDeviceError = Object.assign(
      new Error('EXDEV: cross-device link not permitted'),
      { code: 'EXDEV' },
    );
    const renameSpy = vi
      .spyOn(fs.promises, 'rename')
      .mockRejectedValue(crossDeviceError);

    try {
      asyncStorage.init();
      await asyncStorage.setItem('language', 'en');
      await asyncStorage.setItem('theme', 'dark');

      expect(renameSpy).toHaveBeenCalled();
      expect(JSON.parse(fs.readFileSync(storePath(), 'utf8'))).toEqual({
        language: 'en',
        theme: 'dark',
      });
      expect(
        fs.readdirSync(dataDir).filter(name => name.endsWith('.tmp')),
      ).toEqual([]);
    } finally {
      renameSpy.mockRestore();
    }
  });

  it('keeps a recovery copy of the previous store when writing in place', async () => {
    const renameSpy = vi
      .spyOn(fs.promises, 'rename')
      .mockRejectedValue(Object.assign(new Error('EXDEV'), { code: 'EXDEV' }));

    try {
      asyncStorage.init();
      await asyncStorage.setItem('language', 'en');
      // No store existed before the first write, so nothing to back up yet.
      expect(fs.existsSync(`${storePath()}.bak`)).toBe(false);

      await asyncStorage.setItem('theme', 'dark');
      // The copy holds the complete store from before the overwrite.
      expect(JSON.parse(fs.readFileSync(`${storePath()}.bak`, 'utf8'))).toEqual(
        { language: 'en' },
      );
      expect(JSON.parse(fs.readFileSync(storePath(), 'utf8'))).toEqual({
        language: 'en',
        theme: 'dark',
      });
    } finally {
      renameSpy.mockRestore();
    }
  });

  it('recovers from the backup copy when the store file is malformed', async () => {
    fs.writeFileSync(`${storePath()}.bak`, JSON.stringify({ language: 'en' }));
    // Simulates an in-place write interrupted part-way through.
    fs.writeFileSync(storePath(), '{"language": "en", "the');

    asyncStorage.init();

    expect(await asyncStorage.getItem('language')).toBe('en');
    // The damaged file is still preserved for inspection.
    expect(fs.existsSync(`${storePath()}.corrupt`)).toBe(true);
  });

  it('ignores a malformed backup copy and falls back to defaults', async () => {
    fs.writeFileSync(`${storePath()}.bak`, 'also broken');
    fs.writeFileSync(storePath(), 'broken');

    asyncStorage.init();

    expect(await asyncStorage.getItem('language')).toBeUndefined();
  });

  it('does not replace a valid recovery copy with a malformed active file', async () => {
    fs.writeFileSync(`${storePath()}.bak`, JSON.stringify({ language: 'en' }));
    // A previous in-place write was interrupted, leaving a truncated store.
    fs.writeFileSync(storePath(), '{"language": "en", "the');
    const renameSpy = vi
      .spyOn(fs.promises, 'rename')
      .mockRejectedValue(Object.assign(new Error('EXDEV'), { code: 'EXDEV' }));

    try {
      // Loads from the recovery copy, then saves in place again (EXDEV).
      asyncStorage.init();
      await asyncStorage.setItem('theme', 'dark');

      // The good copy was kept rather than overwritten with the truncated file.
      expect(JSON.parse(fs.readFileSync(`${storePath()}.bak`, 'utf8'))).toEqual(
        { language: 'en' },
      );
      expect(JSON.parse(fs.readFileSync(storePath(), 'utf8'))).toEqual({
        language: 'en',
        theme: 'dark',
      });
    } finally {
      renameSpy.mockRestore();
    }
  });

  it('keeps the recovery copy intact when the in-place write itself fails', async () => {
    const renameSpy = vi
      .spyOn(fs.promises, 'rename')
      .mockRejectedValue(Object.assign(new Error('EXDEV'), { code: 'EXDEV' }));

    try {
      asyncStorage.init();
      await asyncStorage.setItem('language', 'en');

      // Make only the in-place overwrite of the store fail (the temp file and
      // the recovery copy are written first and must still succeed).
      const realWriteFile = fs.promises.writeFile;
      const writeSpy = vi
        .spyOn(fs.promises, 'writeFile')
        .mockImplementation((target, ...rest) => {
          if (target === storePath()) {
            return Promise.reject(
              Object.assign(new Error('EIO'), { code: 'EIO' }),
            );
          }
          return realWriteFile(target, ...rest);
        });

      try {
        await expect(asyncStorage.setItem('theme', 'dark')).rejects.toThrow(
          'EIO',
        );
      } finally {
        writeSpy.mockRestore();
      }

      // The recovery copy still holds the last complete store, and a fresh
      // init after the failed write still sees it via the active file.
      expect(JSON.parse(fs.readFileSync(`${storePath()}.bak`, 'utf8'))).toEqual(
        { language: 'en' },
      );
      asyncStorage.init();
      expect(await asyncStorage.getItem('language')).toBe('en');
    } finally {
      renameSpy.mockRestore();
    }
  });

  it('leaves the active file untouched when the recovery copy cannot be written', async () => {
    const renameSpy = vi
      .spyOn(fs.promises, 'rename')
      .mockRejectedValue(Object.assign(new Error('EXDEV'), { code: 'EXDEV' }));

    try {
      asyncStorage.init();
      await asyncStorage.setItem('language', 'en');
      const before = fs.readFileSync(storePath(), 'utf8');

      // Make only the recovery-copy write fail.
      const realWriteFile = fs.promises.writeFile;
      const writeSpy = vi
        .spyOn(fs.promises, 'writeFile')
        .mockImplementation((target, ...rest) => {
          if (target === `${storePath()}.bak`) {
            return Promise.reject(
              Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' }),
            );
          }
          return realWriteFile(target, ...rest);
        });

      try {
        await expect(asyncStorage.setItem('theme', 'dark')).rejects.toThrow(
          'ENOSPC',
        );
      } finally {
        writeSpy.mockRestore();
      }

      // The save was refused, so the store on disk is exactly as it was.
      expect(fs.readFileSync(storePath(), 'utf8')).toBe(before);
    } finally {
      renameSpy.mockRestore();
    }
  });

  it('still rejects when the rename fails for another reason', async () => {
    const renameSpy = vi
      .spyOn(fs.promises, 'rename')
      .mockRejectedValue(
        Object.assign(new Error('EACCES'), { code: 'EACCES' }),
      );

    try {
      asyncStorage.init();
      await expect(asyncStorage.setItem('language', 'en')).rejects.toThrow(
        'EACCES',
      );
      expect(fs.existsSync(storePath())).toBe(false);
    } finally {
      renameSpy.mockRestore();
    }
  });

  it('starts empty without a backup when no store file exists', () => {
    asyncStorage.init();

    expect(fs.existsSync(storePath())).toBe(false);
    expect(fs.existsSync(`${storePath()}.corrupt`)).toBe(false);
  });

  it('backs up a corrupt store instead of silently wiping it', async () => {
    // Simulate a truncated/corrupt file left behind by an interrupted write
    // (e.g. the process was killed mid-write during an app update).
    const corrupt = '{"language":"en"';
    fs.writeFileSync(storePath(), corrupt, 'utf8');

    // init must not throw, and must start from defaults.
    expect(() => asyncStorage.init()).not.toThrow();
    expect(await asyncStorage.getItem('language')).toBeUndefined();

    // The corrupt content is preserved in a backup so it can be recovered,
    // rather than being thrown away.
    const backupPath = `${storePath()}.corrupt`;
    expect(fs.existsSync(backupPath)).toBe(true);
    expect(fs.readFileSync(backupPath, 'utf8')).toBe(corrupt);
  });

  it('backs up valid JSON of the wrong shape instead of using it as the store', async () => {
    // Parseable JSON, but not a plain object (e.g. `null` or an array) would
    // break `store[key]` access if used directly.
    const invalid = '[]';
    fs.writeFileSync(storePath(), invalid, 'utf8');

    expect(() => asyncStorage.init()).not.toThrow();
    expect(await asyncStorage.getItem('language')).toBeUndefined();

    const backupPath = `${storePath()}.corrupt`;
    expect(fs.existsSync(backupPath)).toBe(true);
    expect(fs.readFileSync(backupPath, 'utf8')).toBe(invalid);
  });
});
