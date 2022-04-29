import React, { useMemo, useEffect, useState } from 'react';
import { CachedPayees } from 'loot-core/src/client/data-hooks/payees';
import { CachedAccounts } from 'loot-core/src/client/data-hooks/accounts';
import { getPayeesById } from 'loot-core/src/client/reducers/queries';
import { groupById } from 'loot-core/src/shared/util';
import { Text } from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';

export default function DisplayId({ type, id, noneColor = colors.n8 }) {
  let DataComponent;

  switch (type) {
    case 'payees':
      DataComponent = CachedPayees;
      break;
    case 'accounts':
      DataComponent = CachedAccounts;
      break;
    default:
      throw new Error('DisplayId: unknown object type: ' + type);
  }

  return (
    <DataComponent idKey={true}>
      {data => {
        let item = data[id];

        return (
          <Text
            style={item == null ? { color: noneColor } : null}
            title={item ? item.name : 'None'}
          >
            {item ? item.name : 'None'}
          </Text>
        );
      }}
    </DataComponent>
  );
}
