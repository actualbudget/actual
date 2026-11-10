import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as fs from '#platform/server/fs';
import * as sqlite from '#platform/server/sqlite';
import type { ServerHandlers } from '#types/server-handlers';

import { installAPI } from './api';
import { app as budgetFilesApp } from './budgetfiles/app';
import { download, importBuffer } from './cloud-storage';
import * as prefs from './prefs';
import { safeZip } from './util/zip';

// Install only the handlers used here rather than bootstrapping the whole app.
vi.mock('#server/main', () => ({ handlers: {} }));

let directory: string;
let databaseBytes: Buffer;

beforeEach(async () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 8, 27));
  directory = mkdtempSync(join(tmpdir(), 'actual-import-'));
  fs._setDocumentDir(directory);
  const filename = join(directory, 'source.sqlite');
  const database = await sqlite.openDatabase(filename);
  sqlite.execQuery(
    database,
    "CREATE TABLE accounts (id TEXT PRIMARY KEY, name TEXT); INSERT INTO accounts VALUES ('account', 'Incoming account')",
  );
  sqlite.closeDatabase(database);
  databaseBytes = readFileSync(filename);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  rmSync(directory, { recursive: true, force: true });
});

function archive(id: string, prefix = '') {
  return safeZip({
    [`${prefix}db.sqlite`]: databaseBytes,
    [`${prefix}metadata.json`]: Buffer.from(
      JSON.stringify({ id, budgetName: 'Incoming' }),
    ),
  });
}

async function createLocal(id = 'victim', cloudFileId = 'original-cloud') {
  const dir = fs.getBudgetDir(id);
  await fs.mkdir(dir);
  await fs.writeFile(join(dir, 'db.sqlite'), databaseBytes);
  const database = await sqlite.openDatabase(join(dir, 'db.sqlite'));
  sqlite.execQuery(database, "UPDATE accounts SET name = 'Original account'");
  sqlite.closeDatabase(database);
  await fs.writeFile(
    join(dir, 'metadata.json'),
    JSON.stringify({
      id,
      budgetName: 'Original',
      cloudFileId,
      groupId: 'old-group',
    }),
  );
  return dir;
}

it.each(['', 'nested/budget/'])(
  'imports cloud archives to fresh IDs and preserves colliding local files (%s)',
  async prefix => {
    const victim = await createLocal();
    const original = readFileSync(join(victim, 'metadata.json'));
    const originalDb = readFileSync(join(victim, 'db.sqlite'));
    const { id } = await importBuffer(
      { fileId: 'incoming-cloud', groupId: 'group' },
      archive('victim', prefix),
    );
    expect(id).not.toBe('victim');
    expect(readFileSync(join(victim, 'metadata.json'))).toEqual(original);
    expect(readFileSync(join(victim, 'db.sqlite'))).toEqual(originalDb);
    expect(
      JSON.parse(
        readFileSync(join(fs.getBudgetDir(id), 'metadata.json'), 'utf8'),
      ),
    ).toMatchObject({ id, cloudFileId: 'incoming-cloud' });
  },
);

it('ignores IDs from local archive imports, including path-like IDs', async () => {
  const { id } = await importBuffer(
    { fileId: null, groupId: null },
    archive('../../outside'),
  );
  expect(id).not.toBe('../../outside');
  expect(
    JSON.parse(
      readFileSync(join(fs.getBudgetDir(id), 'metadata.json'), 'utf8'),
    ),
  ).toMatchObject({ id, cloudFileId: null });
});

it('rejects replacement of a budget associated with another cloud file', async () => {
  const victim = await createLocal();
  const original = readFileSync(join(victim, 'metadata.json'));
  const originalDb = readFileSync(join(victim, 'db.sqlite'));
  await expect(
    importBuffer({ fileId: 'incoming-cloud' }, archive('victim'), 'victim'),
  ).rejects.toMatchObject({ reason: 'mismatched-cloud-file' });
  expect(readFileSync(join(victim, 'metadata.json'))).toEqual(original);
  expect(readFileSync(join(victim, 'db.sqlite'))).toEqual(originalDb);
});

it('replaces the selected budget after a sync ID reset and retains existing backups', async () => {
  const dir = await createLocal('selected', 'incoming-cloud');
  await fs.mkdir(join(dir, 'backups'));
  await fs.writeFile(join(dir, 'backups', 'existing.zip'), 'existing backup');
  expect(
    await importBuffer(
      { fileId: 'incoming-cloud', groupId: 'new-group' },
      archive('untrusted-archive-id'),
      'selected',
    ),
  ).toEqual({ id: 'selected' });
  expect(
    JSON.parse(readFileSync(join(dir, 'metadata.json'), 'utf8')),
  ).toMatchObject({
    id: 'selected',
    budgetName: 'Incoming',
    cloudFileId: 'incoming-cloud',
    groupId: 'new-group',
  });
  expect(readFileSync(join(dir, 'db.sqlite'))).toEqual(databaseBytes);
  expect(readFileSync(join(dir, 'backups', 'existing.zip'), 'utf8')).toBe(
    'existing backup',
  );
});

it('does not combine files from different archive directories', async () => {
  const buffer = safeZip({
    'one/db.sqlite': databaseBytes,
    'two/metadata.json': Buffer.from(
      JSON.stringify({ id: 'victim', budgetName: 'Invalid' }),
    ),
  });
  await expect(importBuffer({ fileId: 'cloud' }, buffer)).rejects.toMatchObject(
    { reason: 'invalid-zip-file' },
  );
});

it('rejects cloud metadata describing a different file than the one requested', async () => {
  const before = await fs.listDir(directory);
  vi.stubGlobal(
    'fetch',
    vi.fn(async url =>
      String(url).endsWith('/get-user-file-info')
        ? new Response(
            JSON.stringify({ status: 'ok', data: { fileId: 'other-file' } }),
          )
        : new Response(new Uint8Array(archive('victim'))),
    ),
  );
  await expect(download('requested-file')).rejects.toMatchObject({
    reason: 'mismatched-cloud-file',
  });
  expect(await fs.listDir(directory)).toEqual(before);
});

it.each([
  {},
  {
    id: 'victim',
    cloudFileId: 'obsolete-cloud',
    groupId: 'obsolete-group',
    encryptKeyId: 'obsolete-key',
  },
])(
  'imports a recovery archive with missing optional metadata or obsolete IDs (%j)',
  async metadata => {
    const victim = await createLocal();
    const original = readFileSync(join(victim, 'metadata.json'));
    const originalDb = readFileSync(join(victim, 'db.sqlite'));
    const buffer = safeZip({
      'db.sqlite': databaseBytes,
      'metadata.json': Buffer.from(JSON.stringify(metadata)),
    });
    // Use the same detached import context as the local .actual importer.
    const { id } = await importBuffer(
      { cloudFileId: null, groupId: null },
      buffer,
    );
    expect(id).not.toBe('victim');
    expect(readFileSync(join(victim, 'metadata.json'))).toEqual(original);
    expect(readFileSync(join(victim, 'db.sqlite'))).toEqual(originalDb);
    expect(readFileSync(join(fs.getBudgetDir(id), 'db.sqlite'))).toEqual(
      databaseBytes,
    );
    const imported = JSON.parse(
      readFileSync(join(fs.getBudgetDir(id), 'metadata.json'), 'utf8'),
    );
    expect(imported).toMatchObject({ id, groupId: null, encryptKeyId: null });
    expect(imported.cloudFileId).toBeUndefined();
  },
);

it.each(['original-cloud', 'different-cloud'])(
  'API downloads after a sync reset replace only a matching cloud file (%s)',
  async fileId => {
    prefs.unloadPrefs();
    await createLocal();
    const remote = { fileId, groupId: 'new-group' };
    const loadBudget = vi.fn().mockResolvedValue({});
    const handlers = Object.assign(installAPI({} as ServerHandlers), {
      ...budgetFilesApp.handlers,
      'get-remote-files': async () => [remote],
      'download-budget': async ({ localId }: { localId?: string }) =>
        importBuffer(remote, archive('victim'), localId),
      'load-budget': loadBudget,
    });

    await handlers['api/download-budget']({ syncId: 'new-group' });

    const budgets = await budgetFilesApp.handlers['get-budgets']();
    const downloaded = budgets.find(b => b.groupId === 'new-group');
    expect(downloaded?.cloudFileId).toBe(fileId);
    expect(budgets).toHaveLength(fileId === 'original-cloud' ? 1 : 2);
    if (fileId === 'original-cloud') {
      expect(downloaded?.id).toBe('victim');
    } else {
      expect(downloaded?.id).not.toBe('victim');
    }
    expect(loadBudget).toHaveBeenCalledWith({ id: downloaded?.id });
  },
);
