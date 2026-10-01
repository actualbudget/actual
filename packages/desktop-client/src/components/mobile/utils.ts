import type { useTranslation } from 'react-i18next';

import type {
  AccountEntity,
  PayeeEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

type GetPrettyPayeeProps = {
  t: ReturnType<typeof useTranslation>['t'];
  transaction?: TransactionEntity;
  payee?: PayeeEntity;
  transferAccount?: AccountEntity;
};

export function getPrettyPayee({
  t,
  transaction,
  payee,
  transferAccount,
}: GetPrettyPayeeProps) {
  if (!transaction) {
    return '';
  }

  if (transferAccount) {
    return t('Transfer {{direction}} {{accountName}}', {
      direction: transaction?.amount > 0 ? t('from') : t('to'),
      accountName: transferAccount.name,
    });
  } else if (transaction.is_parent) {
    return t('Split');
  } else if (payee) {
    return payee.name;
  }

  return '';
}

/**
 * Returns `search` with the `filter` param set to `filter` — or removed when
 * it is empty — leaving any other params intact.
 */
export function withFilterParam(search: string, filter: string) {
  const params = new URLSearchParams(search);
  if (filter) {
    params.set('filter', filter);
  } else {
    params.delete('filter');
  }
  const next = params.toString();
  return next ? `?${next}` : '';
}
