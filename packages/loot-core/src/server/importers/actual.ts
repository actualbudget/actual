// @ts-strict-ignore
import * as fs from '../../platform/server/fs';
import * as sqlite from '../../platform/server/sqlite';
import * as cloudStorage from '../cloud-storage';
import { handlers } from '../main';
import { waitOnSpreadsheet } from '../sheet';

export async function importActual(_filepath: string, buffer: Buffer) {
  // Importing Actual files is a special case because we can directly
  // write down the files, but because it doesn't go through the API
  // layer we need to duplicate some of the workflow
  await handlers['close-budget']();

  let id;
  try {
    ({ id } = await cloudStorage.importBuffer(
      { cloudFileId: null, groupId: null },
      buffer,
    ));
  } catch (e) {
    if (e.type === 'FileDownloadError') {
      return { error: e.reason };
    }
    throw e;
  }

  // We never want to load cached data from imported files, so
  // delete the cache
  const sqliteDb = await sqlite.openDatabase(
    fs.join(fs.getBudgetDir(id), 'db.sqlite'),
  );
  sqlite.execQuery(
    sqliteDb,
    `
          DELETE FROM kvcache;
          DELETE FROM kvcache_key;
        `,
  );
  sqlite.closeDatabase(sqliteDb);

  // Load the budget, force everything to be computed, and try
  // to upload it as a cloud file
  await handlers['load-budget']({ id });
  await handlers['get-budget-bounds']();
  await waitOnSpreadsheet();
  await cloudStorage.upload().catch(() => {});
}
