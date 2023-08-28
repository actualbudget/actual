import React from 'react';

import { useSelectedItems, useSelectedDispatch } from '../../hooks/useSelected';
import { SelectCell, Cell, TableHeader } from '../table';

export default function RulesHeader() {
  let selectedItems = useSelectedItems();
  let dispatchSelected = useSelectedDispatch();

  return (
    <TableHeader version="v2" style={{}}>
      <SelectCell
        exposed={true}
        focused={false}
        selected={selectedItems.size > 0}
        onSelect={e => dispatchSelected({ type: 'select-all', event: e })}
      />
      <Cell value="Stage" width={50} />
      <Cell value="Rule" width="flex" />
    </TableHeader>
  );
}
