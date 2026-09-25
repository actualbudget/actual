import React from 'react';
import { useTranslation } from 'react-i18next';

import { Cell, TableHeader } from '#components/table';
import { useTransactionTableColumnLabels } from '#components/transactions/table/columns';

import {
  CHANGE_LOG_COLUMNS,
  CHANGE_TYPE_COLUMN_WIDTH,
  DEVICE_COLUMN_WIDTH,
  WHEN_COLUMN_WIDTH,
} from './changeLogColumns';

export function ChangeLogHeader() {
  const { t } = useTranslation();
  const labels = useTransactionTableColumnLabels();

  return (
    <TableHeader>
      <Cell value={t('When')} width={WHEN_COLUMN_WIDTH} />
      <Cell value={t('Change type')} width={CHANGE_TYPE_COLUMN_WIDTH} />
      {CHANGE_LOG_COLUMNS.map(column => (
        <Cell
          key={column.id}
          value={labels[column.id]}
          width={column.width}
          style={
            column.minWidth != null ? { minWidth: column.minWidth } : undefined
          }
          alignItems={column.textAlign === 'right' ? 'flex-end' : 'flex-start'}
        />
      ))}
      <Cell
        value={t('Device')}
        width={DEVICE_COLUMN_WIDTH}
        alignItems="flex-end"
      />
    </TableHeader>
  );
}
