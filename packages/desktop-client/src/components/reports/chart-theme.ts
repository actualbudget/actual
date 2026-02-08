import { useIsTestEnv } from '@desktop-client/hooks/useIsTestEnv';

export function getColorScale(name: string): string[] {
  const scales: Record<string, string[]> = {
    grayscale: [
      'var(--color-chartGray1)',
      'var(--color-chartGray2)',
      'var(--color-chartGray3)',
      'var(--color-chartGray4)',
    ],
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
    heatmap: [
      'var(--color-chartHeat1)',
      'var(--color-chartHeat2)',
      'var(--color-chartHeat3)',
      'var(--color-chartHeat4)',
      'var(--color-chartHeat5)',
    ],
    warm: [
      'var(--color-chartWarm1)',
      'var(--color-chartWarm2)',
      'var(--color-chartWarm3)',
      'var(--color-chartWarm4)',
      'var(--color-chartWarm5)',
    ],
    cool: [
      'var(--color-chartCool1)',
      'var(--color-chartCool2)',
      'var(--color-chartCool3)',
      'var(--color-chartCool4)',
      'var(--color-chartCool5)',
    ],
    red: [
      'var(--color-chartRed1)',
      'var(--color-chartRed2)',
      'var(--color-chartRed3)',
      'var(--color-chartRed4)',
      'var(--color-chartRed5)',
    ],
    blue: [
      'var(--color-chartBlue1)',
      'var(--color-chartBlue2)',
      'var(--color-chartBlue3)',
      'var(--color-chartBlue4)',
      'var(--color-chartBlue5)',
    ],
    green: [
      'var(--color-chartGreen1)',
      'var(--color-chartGreen2)',
      'var(--color-chartGreen3)',
      'var(--color-chartGreen4)',
      'var(--color-chartGreen5)',
    ],
  };
  return name ? scales[name] : scales.grayscale;
}

export function useRechartsAnimation(defaults?: {
  animationDuration?: number;
  isAnimationActive?: boolean;
}) {
  const isTestEnv = useIsTestEnv();

  if (isTestEnv) {
    return {
      isAnimationActive: false,
      animationDuration: 0,
    };
  }

  return {
    isAnimationActive: defaults?.isAnimationActive ?? true,
    animationDuration: defaults?.animationDuration,
  };
}
