import React from 'react';

import { integerToCurrency } from 'loot-core/src/shared/util';

import { colorsm, styles } from '../../style';
import { Block } from '../common';

function Change({ amount }) {
  return (
    <Block
      style={[
        styles.smallText,
        { color: amount < 0 ? colorsm.errorText : colorsm.noticeText },
      ]}
    >
      {amount >= 0 ? '+' : ''}
      {integerToCurrency(amount)}
    </Block>
  );
}

export default Change;
