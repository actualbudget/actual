import React from 'react';

import { AnimatedLoading } from '../../icons/AnimatedLoading';
import { theme, styles } from '../../style';
import { Block } from '../common/Block';
import { View } from '../common/View';

type LoadingIndicatorProps = {
  message?: string;
};

export const LoadingIndicator = ({ message }: LoadingIndicatorProps) => {
  return (
    <View
      style={{
        flex: 1,
        gap: 20,
        justifyContent: 'center',
        alignItems: 'center',
        ...styles.delayedFadeIn,
      }}
    >
      {message && (
        <Block style={{ marginBottom: 20, fontSize: 18 }}>{message}</Block>
      )}
      <AnimatedLoading
        style={{ width: 25, height: 25, color: theme.pageTextDark }}
      />
    </View>
  );
};
