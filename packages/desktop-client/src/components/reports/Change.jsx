import React from 'react';

import { integerToCurrency } from 'loot-core/src/shared/util';

import { theme, styles } from '../../style';
import { Block } from '../common/Block';

export function Change({ amount }) {
  return (
    <Block
      style={{
        ...styles.smallText,
        color: amount < 0 ? theme.errorText : theme.noticeTextLight,
      }}
    >
      {amount >= 0 ? '+' : ''}
      {integerToCurrency(amount)}
    </Block>
  );
}
