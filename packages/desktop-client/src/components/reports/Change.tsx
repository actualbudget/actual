import React from 'react';

import { integerToCurrency } from 'loot-core/src/shared/util';

import { styles } from '../../style/styles';
import { theme } from '../../style/theme';
import { type CSSProperties } from '../../style/types';
import { Block } from '../common/Block';

export function Change({
  amount,
  style,
}: {
  amount: number;
  style?: CSSProperties;
}) {
  return (
    <Block
      style={{
        ...styles.smallText,
        color: amount < 0 ? theme.errorText : theme.noticeTextLight,
        ...style,
      }}
    >
      {amount >= 0 ? '+' : ''}
      {integerToCurrency(amount)}
    </Block>
  );
}
