import { useMemo } from 'react';

import type { TransactionEntity } from 'loot-core/types/models';

import { Cell } from '@desktop-client/components/table';
import { DateSelect } from '@desktop-client/components/select/DateSelect';

type DateCellProps = {
  id: TransactionEntity['id'];
  date: string;
  dateFormat: string;
  focused: boolean;
  exposed: boolean;
  isPreview?: boolean;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onUpdate: (field: string, value: string) => void;
};

export function DateCell({
  id,
  date,
  dateFormat,
  focused,
  exposed,
  isPreview,
  onEdit,
  onUpdate,
}: DateCellProps) {
  const formattedDate = useMemo(() => {
    if (!date) return '';
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      });
    } catch {
      return date;
    }
  }, [date]);

  return (
    <Cell
      name="date"
      width={110}
      focused={focused}
      exposed={exposed}
      onExpose={() => onEdit(id, 'date')}
      value={formattedDate}
      style={{ marginLeft: -5 }}
    >
      {exposed && !isPreview && (
        <DateSelect
          value={date || ''}
          dateFormat={dateFormat}
          clearOnBlur
          onUpdate={value => onUpdate('date', value)}
          onSelect={() => {}}
        />
      )}
    </Cell>
  );
}
