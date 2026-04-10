import { useMemo } from 'react';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';

import { integerToCurrency } from 'loot-core/shared/util';
import type { TransactionEntity } from 'loot-core/types/models';

import { Cell, InputCell } from '@desktop-client/components/table';
import { useFormat } from '@desktop-client/hooks/useFormat';

type AmountCellProps = {
  id: TransactionEntity['id'];
  amount: number;
  type: 'debit' | 'credit';
  focused: boolean;
  exposed: boolean;
  hideFraction: boolean;
  isPreview?: boolean;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onUpdate: (field: string, value: string) => void;
};

export function AmountCell({
  id,
  amount,
  type,
  focused,
  exposed,
  hideFraction,
  isPreview,
  onEdit,
  onUpdate,
}: AmountCellProps) {
  const format = useFormat();

  const displayValue = useMemo(() => {
    if (type === 'debit' && amount < 0) {
      return format(-amount, 'financial', { hideFraction });
    }
    if (type === 'credit' && amount > 0) {
      return format(amount, 'financial', { hideFraction });
    }
    return '';
  }, [amount, type, format, hideFraction]);

  const inputValue = useMemo(() => {
    if (type === 'debit' && amount < 0) {
      return integerToCurrency(-amount);
    }
    if (type === 'credit' && amount > 0) {
      return integerToCurrency(amount);
    }
    return '';
  }, [amount, type]);

  return (
    <Cell
      name={type}
      width={100}
      textAlign="right"
      focused={focused}
      exposed={exposed}
      onExpose={() => onEdit(id, type)}
      value={displayValue}
      valueStyle={{
        ...styles.tnum,
        color: amount === 0 ? theme.tableTextInactive : undefined,
      }}
      style={{ marginRight: -5 }}
    >
      {exposed && !isPreview && (
        <InputCell
          value={inputValue}
          onUpdate={value => onUpdate(type, value)}
          inputProps={{
            placeholder: '0.00',
            style: {
              textAlign: 'right',
              ...styles.tnum,
            },
          }}
        />
      )}
    </Cell>
  );
}
