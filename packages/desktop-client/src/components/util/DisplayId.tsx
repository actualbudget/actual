// @ts-strict-ignore
import React from 'react';

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
  const account = useAccount(id);
  return (
    <Text
      style={account == null ? { color: noneColor } : null}
      title={account ? account.name : 'None'}
    >
      {account ? account.name : 'None'}
    </Text>
  );
}

function PayeeDisplayId({ id, noneColor }) {
  const payee = usePayee(id);
  return (
    <Text
      style={payee == null ? { color: noneColor } : null}
      title={payee ? payee.name : 'None'}
    >
      {payee ? payee.name : 'None'}
    </Text>
  );
}
