import * as db from '#server/db';
import { ValidationError } from '#server/errors';
import { accountModel } from '#server/models';
import { isSqlConversionEnabled } from '#shared/fx/sql';

// Accounts only get or change a currency of their own while multiple
// currencies are on, as through the API
export function checkMultipleCurrenciesEnabled() {
  if (!isSqlConversionEnabled()) {
    throw new ValidationError('multiple currencies are not enabled');
  }
}

// Checks that an account can be given `currency`, and returns whether that
// changes its currency. An account keeps a currency it already has, even
// one that can no longer be chosen. Setting the currency of an account that
// doesn't exist would create a row for it, so that is refused. Amounts of
// every currency are stored at the same scale, so a change only relabels
// them.
export async function checkAccountCurrencyChange(
  accountId: db.DbAccount['id'],
  currency: db.DbAccount['currency'],
): Promise<boolean> {
  const account = await db.first<Pick<db.DbAccount, 'currency'>>(
    'SELECT currency FROM accounts WHERE id = ? AND tombstone = 0',
    [accountId],
  );
  if (!account) {
    throw new ValidationError(`account does not exist: ${accountId}`);
  }
  if ((account.currency ?? null) === (currency ?? null)) {
    return false;
  }
  accountModel.validateCurrency(currency);
  return true;
}
