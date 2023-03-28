import React from 'react';

import { integerToCurrency } from 'loot-core/src/shared/util';

import { colors, styles } from '../../style';
import { Block } from '../common';

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
