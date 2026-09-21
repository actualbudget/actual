import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as fs from '#platform/server/fs';
import * as sqlite from '#platform/server/sqlite';
import * as db from '#server/db';
import * as prefs from '#server/prefs';

import {
  readDatabaseEntries,
  recoverLocalEncoding,
} from './amount-encoding/files';
import { exportBuffer } from './cloud-storage';
import { safeUnzip } from './util/zip';

beforeEach(global.emptyDatabase());
beforeEach(() => prefs.loadPrefs());
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-01-01'));
  const dataDir = await mkdtemp(join(tmpdir(), 'transition-export-'));
  vi.stubEnv('ACTUAL_DATA_DIR', dataDir);
  vi.spyOn(fs, 'getBudgetDir').mockReturnValue(join(dataDir, 'budget'));
  onTestFinished(async () => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    await rm(dataDir, { recursive: true, force: true });
  });
});
afterEach(() => vi.restoreAllMocks());

it.each([true, false])(
  'exports a transition snapshot with pending recovery state omitted: %s',
  async omitAmountEncodingTransition => {
    const encoding = '{"version":1,"currencyCode":"USD","precision":2}';
    const pending = {
      id: 'transition',
      sourceGroupId: 'old-group',
      sourceEncoding: null,
      targetEncoding: encoding,
      targetCurrencyCode: 'USD',
    };
    await prefs.savePrefs({
      amountEncoding: encoding,
      amountEncodingTransition: pending,
    });
    db.runQuery(
      'INSERT OR REPLACE INTO preferences (id, value) VALUES (?, ?), (?, ?)',
      [
        'amountEncoding',
        encoding,
        'amountEncodingTransition',
        JSON.stringify(pending),
      ],
    );
    const database = db.getDatabase();
    if (!database) throw new Error('Expected an open budget');
    const source = await sqlite.exportDatabase(database);
    const budgetDir = fs.getBudgetDir(prefs.getPrefs().id);
    await mkdir(budgetDir);
    await writeFile(fs.join(budgetDir, 'db.sqlite'), source);
    await writeFile(
      fs.join(budgetDir, 'metadata.json'),
      JSON.stringify(prefs.getPrefs()),
    );

    const exported = await exportBuffer({
      omitAmountEncodingTransition,
      alreadyMutating: true,
    });
    if (!exported) throw new Error('Expected a budget archive');
    const entries = safeUnzip(exported.data);
    const downloaded = await sqlite.openDatabase(
      Buffer.from(readDatabaseEntries(entries).content),
    );
    try {
      expect(recoverLocalEncoding(downloaded)).toEqual({
        amountEncoding: encoding,
        amountEncodingTransition: omitAmountEncodingTransition
          ? undefined
          : pending,
      });
      expect(
        JSON.parse(Buffer.from(entries['metadata.json']).toString())
          .amountEncodingTransition,
      ).toEqual(omitAmountEncodingTransition ? undefined : pending);
      expect(recoverLocalEncoding(database).amountEncodingTransition).toEqual(
        pending,
      );
    } finally {
      sqlite.closeDatabase(downloaded);
    }
  },
);
