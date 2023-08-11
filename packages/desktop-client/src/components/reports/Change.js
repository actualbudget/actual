import React from 'react';

import { integerToCurrency } from 'loot-core/src/shared/util';

import { theme, styles } from '../../style';
import Block from '../common/Block';

function Change({ amount }) {
  return (
    <Block
      style={[
        styles.smallText,
        { color: amount < 0 ? theme.errorText : theme.noticeText },
      ]}
    >
      {amount >= 0 ? '+' : ''}
      {integerToCurrency(amount)}
    </Block>
  );
}

export default Change;
