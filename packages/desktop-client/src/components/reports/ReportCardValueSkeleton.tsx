import React from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, keyframes } from '@emotion/css';

const pulse = keyframes({
  '0%, 100%': { opacity: 0.15 },
  '50%': { opacity: 0.4 },
});

export function ReportCardValueSkeleton() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <div
        aria-hidden="true"
        className={css({
          width: '55%',
          maxWidth: 160,
          height: 32,
          borderRadius: 6,
          backgroundColor: theme.pageText,
          animationName: pulse,
          animationDuration: '1.4s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
        })}
      />
    </View>
  );
}
