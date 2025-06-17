import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  SelectCell,
  Cell,
  TableHeader,
} from '@desktop-client/components/table';
import {
  useSelectedItems,
  useSelectedDispatch,
} from '@desktop-client/hooks/useSelected';

export function TagsHeader() {
  const { t } = useTranslation();
  const selectedItems = useSelectedItems();
  const dispatchSelected = useSelectedDispatch();

  return (
    <TableHeader>
      <SelectCell
        exposed={true}
        focused={false}
        selected={selectedItems.size > 0}
        onSelect={e =>
          dispatchSelected({ type: 'select-all', isRangeSelect: e.shiftKey })
        }
      />
      <Cell value={t('Tag')} width={250} />
      <Cell value={t('Description')} width="flex" />
    </TableHeader>
  );
}
