import React from 'react';

import { Block } from '@actual-app/components/block';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

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
