// @ts-strict-ignore
import { v4 as uuidv4 } from 'uuid';

import * as db from '../db';

export async function findOrCreateBank(institution, requisitionId) {
  const bank = await db.first(
    'SELECT id, bank_id, name FROM banks WHERE bank_id = ?',
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
