import { useMemo } from 'react';

import type {
  AccountEntity,
  PayeeEntity,
  ScheduleEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { PayeeAutocomplete } from '#components/autocomplete/PayeeAutocomplete';
import { CustomCell } from '#components/table';

import { PayeeCellDisplay } from './PayeeCellDisplay';

type PayeeCellProps = {
  id: TransactionEntity['id'];
  payee: PayeeEntity | null | undefined;
  transferAccount: AccountEntity | null | undefined;
  schedule: ScheduleEntity | null | undefined;
  payees: PayeeEntity[];
  width: number | 'flex';
  focused: boolean;
  exposed: boolean;
  isPreview?: boolean;
  isSplitParent?: boolean;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onUpdate: (field: string, value: string | null) => void;
  onManagePayees: (id?: PayeeEntity['id']) => void;
  onNavigateToTransferAccount: (id: AccountEntity['id']) => void;
  onNavigateToSchedule: (id: ScheduleEntity['id']) => void;
};

export function PayeeCell({
  id,
  payee,
  transferAccount,
  schedule,
  payees,
  width,
  focused,
  exposed,
  isPreview,
  isSplitParent,
  onEdit,
  onUpdate,
  onManagePayees,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
}: PayeeCellProps) {
  const displayPayee = useMemo(
    () => (transferAccount ? transferAccount.name : payee?.name || ''),
    [payee, transferAccount],
  );

  const displayMode = useMemo(() => {
    if (isSplitParent) {
      return 'split' as const;
    }

    if (schedule) {
      return 'schedule' as const;
    }

    if (transferAccount || payee?.transfer_acct) {
      return 'transfer' as const;
    }

    return 'plain' as const;
  }, [isSplitParent, schedule, transferAccount, payee]);

  const handleClick = () => {
    if (transferAccount) {
      onNavigateToTransferAccount(transferAccount.id);
    } else if (schedule) {
      onNavigateToSchedule(schedule.id);
    }
  };

  return (
    <CustomCell
      name="payee"
      width={width}
      focused={focused}
      exposed={exposed}
      onExpose={() => !isPreview && onEdit(id, 'payee')}
      textAlign="flex"
      value={payee?.id || ''}
      formatter={() => displayPayee}
      style={{ marginLeft: -5 }}
      onUpdate={value => onUpdate('payee', value || null)}
      valueStyle={{
        cursor: displayMode !== 'plain' ? 'pointer' : undefined,
        ':hover':
          displayMode !== 'plain' ? { textDecoration: 'underline' } : undefined,
      }}
      unexposedContent={() => (
        <PayeeCellDisplay
          displayPayee={displayPayee}
          mode={displayMode}
          onClick={handleClick}
        />
      )}
    >
      {({ onBlur, onKeyDown, onUpdate: setValue, onSave, inputStyle }) =>
        !isPreview ? (
          <PayeeAutocomplete
            payees={payees}
            value={payee?.id || null}
            focused
            clearOnBlur={false}
            showManagePayees
            inputProps={{ onBlur, onKeyDown, style: inputStyle }}
            onUpdate={(_, value) => setValue(value || '')}
            onSelect={value =>
              onSave(Array.isArray(value) ? '' : (value ?? ''))
            }
            onManagePayees={() => onManagePayees(payee?.id)}
          />
        ) : null
      }
    </CustomCell>
  );
}
