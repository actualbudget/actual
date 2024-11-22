import React from 'react';

import { Cell, TableHeader } from '../../table';

export function UserAccessHeader() {
  return (
    <TableHeader>
      <Cell value="Access" width={100} style={{ paddingLeft: 15 }} />
      <Cell value="User" width="flex" />
      <Cell value="Owner" width={100} />
    </TableHeader>
  );
}
