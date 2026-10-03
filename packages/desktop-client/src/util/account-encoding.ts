import type { AccountEntity } from '@actual-app/core/types/models';

type Encoded = Pick<AccountEntity, 'currency' | 'currency_precision'>;

function encodingKey(account: Encoded | undefined) {
  return `${account?.currency ?? ''}:${account?.currency_precision ?? ''}`;
}

/**
 * Accounts that rows from `sources` cannot move to: native integers keep
 * their value only within one recorded encoding, so mixed sources allow none.
 */
export function incompatibleAccountIds(
  accounts: Array<Encoded & Pick<AccountEntity, 'id'>>,
  sources: Array<Encoded | undefined>,
): Array<AccountEntity['id']> {
  const keys = new Set(sources.map(encodingKey));
  return accounts
    .filter(account => keys.size !== 1 || !keys.has(encodingKey(account)))
    .map(account => account.id);
}
