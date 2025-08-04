import {
  type AccountEntity,
  type PayeeEntity,
  type TransactionEntity,
} from 'loot-core/types/models';
import { useTranslation } from 'react-i18next';

type GetPrettyPayeeProps = {
  transaction?: TransactionEntity;
  payee?: PayeeEntity;
  transferAccount?: AccountEntity;
};

export function getPrettyPayee({
  transaction,
  payee,
  transferAccount,
}: GetPrettyPayeeProps) {
  const { t } = useTranslation();

  if (!transaction) {
    return '';
  }

  if (transferAccount) {
    return t('Transfer {{direction}} {{accountName}}', {
      direction: transaction?.amount > 0 ? t('from') : t('to'),
      accountName: transferAccount.name
    });
  } else if (transaction.is_parent) {
    return t('Split');
  } else if (payee) {
    return payee.name;
  }

  return '';
}
