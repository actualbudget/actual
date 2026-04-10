import { useMemo } from 'react';

import {
  SvgArrowsSynchronize,
  SvgCalendar3,
  SvgHyperlink2,
} from '@actual-app/components/icons/v2';
import { theme } from '@actual-app/components/theme';

import type {
  AccountEntity,
  PayeeEntity,
  ScheduleEntity,
  TransactionEntity,
} from 'loot-core/types/models';

import { Cell } from '@desktop-client/components/table';
import { PayeeAutocomplete } from '@desktop-client/components/autocomplete/PayeeAutocomplete';
import { useDisplayPayee } from '@desktop-client/hooks/useDisplayPayee';

type PayeeCellProps = {
  id: TransactionEntity['id'];
  payee: PayeeEntity | null | undefined;
  transferAccount: AccountEntity | null | undefined;
  schedule: ScheduleEntity | null | undefined;
  payees: PayeeEntity[];
  focused: boolean;
  exposed: boolean;
  isPreview?: boolean;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onUpdate: (field: string, value: string | null) => void;
  onCreatePayee: (name: string) => Promise<null | PayeeEntity['id']>;
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
  focused,
  exposed,
  isPreview,
  onEdit,
  onUpdate,
  onCreatePayee,
  onManagePayees,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
}: PayeeCellProps) {
  const displayPayee = useDisplayPayee(payee, transferAccount);

  const payeeIcon = useMemo(() => {
    const iconStyle = {
      width: 10,
      height: 10,
      marginRight: 5,
      color: theme.pageTextSubdued,
      flexShrink: 0,
    };

    if (schedule) {
      return <SvgCalendar3 style={iconStyle} />;
    }
    if (transferAccount) {
      return <SvgArrowsSynchronize style={iconStyle} />;
    }
    if (payee?.transfer_acct) {
      return <SvgArrowsSynchronize style={iconStyle} />;
    }
    return null;
  }, [schedule, transferAccount, payee]);

  const handleClick = () => {
    if (transferAccount) {
      onNavigateToTransferAccount(transferAccount.id);
    } else if (schedule) {
      onNavigateToSchedule(schedule.id);
    }
  };

  const showClickable = !!(transferAccount || schedule);

  return (
    <Cell
      name="payee"
      width="flex"
      focused={focused}
      exposed={exposed}
      onExpose={() => onEdit(id, 'payee')}
      value={displayPayee}
      style={{ marginLeft: -5 }}
      valueStyle={{
        cursor: showClickable ? 'pointer' : undefined,
        ':hover': showClickable
          ? { textDecoration: 'underline' }
          : undefined,
      }}
      unexposedContent={({ value }) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexGrow: 1,
            overflow: 'hidden',
          }}
          onClick={showClickable ? handleClick : undefined}
        >
          {payeeIcon}
          {showClickable && (
            <SvgHyperlink2
              style={{
                width: 9,
                height: 9,
                marginRight: 4,
                color: theme.pageTextLink,
              }}
            />
          )}
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {value}
          </span>
        </div>
      )}
    >
      {exposed && !isPreview && (
        <PayeeAutocomplete
          value={payee?.id || null}
          payees={payees}
          onUpdate={value => onUpdate('payee', value)}
          onCreatePayee={onCreatePayee}
          onManagePayees={onManagePayees}
          isOpen
        />
      )}
    </Cell>
  );
}
