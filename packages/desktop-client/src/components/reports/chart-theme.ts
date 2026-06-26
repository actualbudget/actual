import { useMemo } from 'react';

import { useReducedMotion } from '#hooks/useReducedMotion';

export function getColorScale(name: string): string[] {
  const scales: Record<string, string[]> = {
    qualitative: [
      'var(--color-chartQual1)', // Dark Teal
      'var(--color-chartQual2)', // Yellow
      'var(--color-chartQual3)', // Orange
      'var(--color-chartQual4)', // Light Red
      'var(--color-chartQual5)', // Blue
      'var(--color-chartQual6)', // Peach
      'var(--color-chartQual7)', // Light Teal
      'var(--color-chartQual8)', // Light Yellow
      'var(--color-chartQual9)', // Light Red
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
