import { useMemo } from 'react';

import type { AccountEntity, TransactionEntity } from 'loot-core/types/models';

import { AccountAutocomplete } from '@desktop-client/components/autocomplete/AccountAutocomplete';
import { CustomCell } from '@desktop-client/components/table';

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
    <CustomCell
      name="account"
      width="flex"
      textAlign="flex"
      focused={focused}
      exposed={exposed}
      onExpose={() => !isPreview && onEdit(id, 'account')}
      value={account?.id || ''}
      formatter={() => accountName}
      style={{ marginLeft: -5 }}
      onUpdate={value => {
        if (value) {
          onUpdate('account', value);
        }
      }}
    >
      {({ onBlur, onKeyDown, onUpdate: setValue, onSave, inputStyle }) =>
        !isPreview ? (
          <AccountAutocomplete
            value={account?.id || null}
            focused
            clearOnBlur={false}
            inputProps={{ onBlur, onKeyDown, style: inputStyle }}
            onUpdate={setValue}
            onSelect={onSave}
          />
        ) : null
      }
    </CustomCell>
  );
}
