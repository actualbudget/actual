import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  Cell,
  SelectCell,
  TableHeader,
} from '@desktop-client/components/table';
import {
  useSelectedDispatch,
  useSelectedItems,
} from '@desktop-client/hooks/useSelected';

export function RulesHeader() {
  const { t } = useTranslation();
  const selectedItems = useSelectedItems();
  const dispatchSelected = useSelectedDispatch();

  return (
    <TableHeader style={{}}>
      <SelectCell
        exposed
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
