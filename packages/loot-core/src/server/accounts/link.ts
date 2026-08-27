// @ts-strict-ignore
import { v4 as uuidv4 } from 'uuid';

import * as db from '#server/db';

type Institution = string | { name?: string | null };

function getInstitutionName(institution: Institution | null | undefined) {
  if (typeof institution === 'string') {
    return institution;
  }
  return institution?.name ?? null;
}

/**
 * Finds the bank record for a bank-sync connection, creating one if needed.
 *
 * The provider identifier alone is not enough to tell connections apart: some
 * providers (SimpleFIN in particular) report the institution's domain as that
 * identifier. Two separate logins at the same bank would then share a single
 * bank record, and accounts linked through the second connection would be
 * displayed under the first connection's name. Matching on the institution
 * name as well keeps those connections apart, while still reusing the record
 * when the same connection is linked again.
 */
export async function findOrCreateBank(
  institution: Institution | null | undefined,
  bankId: db.DbBank['bank_id'] | undefined,
): Promise<Pick<db.DbBank, 'id' | 'bank_id'>> {
  const name = getInstitutionName(institution);

  // `IS` instead of `=` so records with a null name (providers that don't
  // report an institution) still match.
  const bank = await db.first<Pick<db.DbBank, 'id' | 'bank_id'>>(
    'SELECT id, bank_id FROM banks WHERE bank_id = ? AND name IS ?',
    [bankId, name],
  );

  if (bank) {
    return bank;
  }

  const bankData = {
    id: uuidv4(),
    bank_id: bankId,
    name,
  };

  await db.insertWithUUID('banks', bankData);

  return bankData;
}
