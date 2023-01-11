import React from 'react';

import { integerToCurrency } from 'loot-core/src/shared/util';
import { Block } from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';

function Change({ amount }) {
  return (
    <Block
      style={[styles.smallText, { color: amount < 0 ? colors.r5 : colors.g5 }]}
    >
      {amount >= 0 ? '+' : ''}
      {integerToCurrency(amount)}
    </Block>
  );
}

export default Change;
