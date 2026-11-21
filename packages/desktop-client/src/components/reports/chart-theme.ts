import { useMemo } from 'react';

import { theme } from '@actual-app/components/theme';

import { useReducedMotion } from '#hooks/useReducedMotion';

export function getColorScale(name: string): string[] {
  const scales: Record<string, string[]> = {
    qualitative: [
      theme.chartQual1, // Dark Teal
      theme.chartQual2, // Yellow
      theme.chartQual3, // Orange
      theme.chartQual4, // Light Red
      theme.chartQual5, // Blue
      theme.chartQual6, // Peach
      theme.chartQual7, // Light Teal
      theme.chartQual8, // Light Yellow
      theme.chartQual9, // Light Red
    ],
  };
  return name ? scales[name] : scales.qualitative;
}

export function useRechartsAnimation(defaults?: {
  animationDuration?: number;
  isAnimationActive?: boolean;
}) {
  const reducedMotion = useReducedMotion();

  const isAnimationActive = reducedMotion
    ? false
    : (defaults?.isAnimationActive ?? true);
  const animationDuration = reducedMotion ? 0 : defaults?.animationDuration;

  // The returned object must be referentially stable: recharts re-runs chart
  // animations (hiding labels while animating) whenever element identity
  // changes, and this file is outside the React Compiler's *.tsx include, so
  // it isn't auto-memoized.
  return useMemo(
    () => ({ isAnimationActive, animationDuration }),
    [isAnimationActive, animationDuration],
  );
}
