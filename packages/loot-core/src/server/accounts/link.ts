// @ts-strict-ignore
import { v4 as uuidv4 } from 'uuid';

import * as db from '#server/db';

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

export function getExternalBankKey(
  institutionName: string,
  institutionExternalId?: string | null,
) {
  const normalizedExternalId = institutionExternalId?.trim();

  return normalizedExternalId
    ? `external:id:${normalizedExternalId}`
    : `external:name:${institutionName.trim()}`;
}

export async function findOrCreateExternalBank(
  institutionName: string,
  institutionExternalId?: string | null,
) {
  const bankKey = getExternalBankKey(institutionName, institutionExternalId);
  const bank = await db.first<Pick<db.DbBank, 'id' | 'bank_id'>>(
    'SELECT id, bank_id FROM banks WHERE bank_id = ?',
    [bankKey],
  );

  if (bank) {
    return bank;
  }

  const bankData = {
    id: crypto.randomUUID(),
    bank_id: bankKey,
    name: institutionName,
  };

  await db.insertWithUUID('banks', bankData);

  return bankData;
}
