import React from 'react';
import { useTranslation } from 'react-i18next';

import { useSelectedItems, useSelectedDispatch } from '../../hooks/useSelected';
import { SelectCell, Cell, TableHeader } from '../table';

export function RulesHeader() {
  const { t } = useTranslation();
  const selectedItems = useSelectedItems();
  const dispatchSelected = useSelectedDispatch();

  return (
    <TableHeader style={{}}>
      <SelectCell
        exposed={true}
        focused={false}
        selected={selectedItems.size > 0}
        onSelect={e =>
          dispatchSelected({ type: 'select-all', isRangeSelect: e.shiftKey })
        }
      />
      <Cell value={t('Stage')} width={50} />
      <Cell value={t('Rule')} width="flex" />
    </TableHeader>
  );
}
