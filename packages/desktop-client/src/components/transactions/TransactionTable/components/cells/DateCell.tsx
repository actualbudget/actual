import { useMemo } from 'react';

import type { TransactionEntity } from 'loot-core/types/models';

import { DateSelect } from '@desktop-client/components/select/DateSelect';
import { CustomCell } from '@desktop-client/components/table';

type DateCellProps = {
  id: TransactionEntity['id'];
  date: string;
  dateFormat: string;
  width: number;
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
  width,
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
    <CustomCell
      name="date"
      width={width}
      textAlign="flex"
      focused={focused}
      exposed={exposed}
      onExpose={() => !isPreview && onEdit(id, 'date')}
      value={date || ''}
      formatter={() => formattedDate}
      style={{ marginLeft: -5 }}
      onUpdate={value => onUpdate('date', value)}
    >
      {({ onBlur, onKeyDown, onUpdate: setValue, onSave, shouldSaveFromKey, inputStyle }) =>
        !isPreview ? (
          <DateSelect
            value={date || ''}
            dateFormat={dateFormat}
            inputProps={{ onBlur, onKeyDown, style: inputStyle }}
            shouldSaveFromKey={shouldSaveFromKey}
            clearOnBlur
            onUpdate={setValue}
            onSelect={onSave}
          />
        ) : null
      }
    </CustomCell>
  );
}
