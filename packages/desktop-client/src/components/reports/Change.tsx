import React, { type CSSProperties } from 'react';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';

import { useFormat } from '@desktop-client/hooks/useFormat';

export function Change({
  amount,
  style,
}: {
  amount: number;
  style?: CSSProperties;
}) {
  const format = useFormat();

  return (
    <Block
      style={{
        ...styles.smallText,
        color: amount < 0 ? theme.errorText : theme.noticeTextLight,
        ...style,
      }}
    >
      {amount >= 0 ? '+' : ''}
      {format(amount, 'financial')}
    </Block>
  );
}
