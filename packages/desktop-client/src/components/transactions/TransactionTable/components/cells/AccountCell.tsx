import { useMemo } from 'react';

import type { AccountEntity, TransactionEntity } from 'loot-core/types/models';

import { Cell } from '@desktop-client/components/table';
import { AccountAutocomplete } from '@desktop-client/components/autocomplete/AccountAutocomplete';

type AccountCellProps = {
  id: TransactionEntity['id'];
  account: AccountEntity | null | undefined;
  accounts: AccountEntity[];
  focused: boolean;
  exposed: boolean;
  isPreview?: boolean;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onUpdate: (field: string, value: string | null) => void;
};

export function AccountCell({
  id,
  account,
  accounts,
  focused,
  exposed,
  isPreview,
  onEdit,
  onUpdate,
}: AccountCellProps) {
  const accountName = useMemo(() => {
    return account?.name || '';
  }, [account]);

  return (
    <Cell
      name="account"
      width="flex"
      focused={focused}
      exposed={exposed}
      onExpose={() => onEdit(id, 'account')}
      value={accountName}
      style={{ marginLeft: -5 }}
    >
      {exposed && !isPreview && (
        <AccountAutocomplete
          value={account?.id || null}
          accounts={accounts}
          onUpdate={value => onUpdate('account', value)}
          isOpen
        />
      )}
    </Cell>
  );
}
