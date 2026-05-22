import React from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, keyframes } from '@emotion/css';

import { useReducedMotion } from '#hooks/useReducedMotion';

const pulse = keyframes({
  '0%, 100%': { opacity: 0.15 },
  '50%': { opacity: 0.4 },
});

const barBase = {
  width: '55%',
  maxWidth: 160,
  height: 32,
  borderRadius: 6,
  backgroundColor: theme.pageText,
};

const staticBar = css({ ...barBase, opacity: 0.25 });
const pulsingBar = css({
  ...barBase,
  animationName: pulse,
  animationDuration: '1.4s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
});

export function ReportCardValueSkeleton() {
  const reducedMotion = useReducedMotion();
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
        className={reducedMotion ? staticBar : pulsingBar}
      />
    </View>
  );
}
