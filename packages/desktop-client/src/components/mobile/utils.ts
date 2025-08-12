import { type useTranslation } from 'react-i18next';

import {
  type AccountEntity,
  type PayeeEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

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
