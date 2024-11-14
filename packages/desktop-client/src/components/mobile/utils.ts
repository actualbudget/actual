import {
  type AccountEntity,
  type PayeeEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

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
  if (!transaction) {
    return '';
  }

  if (transferAccount) {
    return `Transfer ${transaction?.amount > 0 ? 'from' : 'to'} ${transferAccount.name}`;
  } else if (transaction.is_parent) {
    return 'Split';
  } else if (payee) {
    return payee.name;
  }

  return '';
}
