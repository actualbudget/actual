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
});
