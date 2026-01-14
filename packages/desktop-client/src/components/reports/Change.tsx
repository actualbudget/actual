import React, { type CSSProperties } from 'react';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';

import { TNum } from '@desktop-client/components/TNum';
import { useFormat } from '@desktop-client/hooks/useFormat';

export function Change({
  amount,
  style,
}: {
  amount: number;
  style?: CSSProperties;
}) {
  const format = useFormat();
  const textStyle = {
    ...styles.smallText,
    color: amount < 0 ? theme.errorText : theme.noticeTextLight,
    ...style,
  };

  return (
    <Block style={textStyle}>
      <TNum style={textStyle}>
        {amount >= 0 ? '+' : ''}
        {format(amount, 'financial')}
      </TNum>
    </Block>
  );
}
