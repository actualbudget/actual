// @ts-strict-ignore
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useAccount } from '../../hooks/useAccount';
import { usePayee } from '../../hooks/usePayee';
import { theme } from '../../style';
import { Text } from '../common/Text';

type DisplayIdProps = {
  type: 'accounts' | 'payees';
  id: string;
  noneColor?: string;
};

export function DisplayId({
  type,
  id,
  noneColor = theme.pageTextSubdued,
}: DisplayIdProps) {
  return type === 'accounts' ? (
    <AccountDisplayId id={id} noneColor={noneColor} />
  ) : (
    <PayeeDisplayId id={id} noneColor={noneColor} />
  );
}

function AccountDisplayId({ id, noneColor }) {
  const { t } = useTranslation();
  const account = useAccount(id);
  return (
    <Text
      style={account == null ? { color: noneColor } : null}
      title={account ? account.name : t('None')}
    >
      {account ? account.name : t('None')}
    </Text>
  );
}

function PayeeDisplayId({ id, noneColor }) {
  const { t } = useTranslation();
  const payee = usePayee(id);
  return (
    <Text
      style={payee == null ? { color: noneColor } : null}
      title={payee ? payee.name : t('None')}
    >
      {payee ? payee.name : t('None')}
    </Text>
  );
}
