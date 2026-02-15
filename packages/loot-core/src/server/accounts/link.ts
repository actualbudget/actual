// @ts-strict-ignore
import { v4 as uuidv4 } from 'uuid';

import * as db from '../db';

export async function findOrCreateBank(institution, requisitionId) {
  const bank = await db.first<Pick<db.DbBank, 'id' | 'bank_id'>>(
    'SELECT id, bank_id FROM banks WHERE bank_id = ?',
    [requisitionId],
  );

  if (bank) {
    return bank;
  }

  const bankData = {
    id: uuidv4(),
    bank_id: requisitionId,
    name: institution.name,
  };

  await db.insertWithUUID('banks', bankData);

  return bankData;
}
