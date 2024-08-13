import React from 'react';

import {
  useSelectedItems,
  useSelectedDispatch,
} from '../../../hooks/useSelected';
import { SelectCell, Cell, TableHeader } from '../../table';

export function UserDirectoryHeader() {
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
      <Cell value="Username" width="flex" />
      <Cell value="Display Name" width={250} />
      <Cell value="Role" width={100} />
      <Cell value="Enabled" width={100} />
      <Cell value="Master" width={100} />
      <Cell value="" width={80} />
    </TableHeader>
  );
}
