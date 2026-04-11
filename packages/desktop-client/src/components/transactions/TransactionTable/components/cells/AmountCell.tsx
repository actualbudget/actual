import { useMemo } from 'react';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';

import { integerToCurrency } from 'loot-core/shared/util';
import type { TransactionEntity } from 'loot-core/types/models';

import { InputCell } from '@desktop-client/components/table';
import { useFormat } from '@desktop-client/hooks/useFormat';

type AmountCellProps = {
  id: TransactionEntity['id'];
  amount: number;
  type: 'debit' | 'credit';
  width: number;
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
  width,
  focused,
  exposed,
  isPreview,
  onEdit,
  onUpdate,
}: AmountCellProps) {
  const format = useFormat();

  const displayValue = useMemo(() => {
    if (type === 'debit' && amount < 0) {
      return format(-amount, 'financial');
    }
    if (type === 'credit' && amount > 0) {
      return format(amount, 'financial');
    }
    return '';
  }, [amount, type, format]);

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
    <InputCell
      name={type}
      width={width}
      textAlign="right"
      focused={focused}
      exposed={exposed}
      onExpose={() => !isPreview && onEdit(id, type)}
      value={displayValue}
      valueStyle={{
        ...styles.tnum,
        color: amount === 0 ? theme.tableTextInactive : undefined,
      }}
      style={{ marginRight: -5 }}
      inputProps={{
        value: inputValue,
        placeholder: '0.00',
        style: {
          textAlign: 'right',
          ...styles.tnum,
        },
      }}
      onUpdate={value => onUpdate(type, value)}
    />
  );
}
