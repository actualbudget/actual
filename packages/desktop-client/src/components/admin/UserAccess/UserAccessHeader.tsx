import React from 'react';

import {
  useSelectedItems,
  useSelectedDispatch,
} from '../../../hooks/useSelected';
import { SelectCell, Cell, TableHeader } from '../../table';

export function UserAccessHeader() {
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
      <Cell value="User" width="flex" />
    </TableHeader>
  );
}
