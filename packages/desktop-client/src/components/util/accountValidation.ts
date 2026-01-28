import { t } from 'i18next';

import type { AccountEntity } from 'loot-core/types/models';

export function validateAccountName(
  newAccountName: string,
  accountId: string,
  accounts: AccountEntity[],
): string {
  newAccountName = newAccountName.trim();
  if (newAccountName.length) {
    const duplicateNamedAccounts = accounts.filter(
      account => account.name === newAccountName && account.id !== accountId,
    );
    if (duplicateNamedAccounts.length) {
      return t('Name {{ newAccountName }} already exists.', { newAccountName });
    } else {
      return '';
    }
  } else {
    return t('Name cannot be blank.');
  }
}
