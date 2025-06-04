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

export function UserDirectoryHeader() {
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
      <Cell value={t('Username')} width="flex" />
      <Cell value={t('Display Name')} width={250} />
      <Cell value={t('Role')} width={100} />
      <Cell value={t('Enabled')} width={100} />
      <Cell value={t('Server Owner')} width={100} />
      <Cell value="" width={80} />
    </TableHeader>
  );
}
