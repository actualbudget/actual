import { useIsTestEnv } from '@desktop-client/hooks/useIsTestEnv';

export function getColorScale(name: string): string[] {
  const scales: Record<string, string[]> = {
    grayscale: ['#cccccc', '#969696', '#636363', '#252525'],
    qualitative: [
      '#45B29D', //Dark Teal
      '#EFC94C', //Yellow
      '#E27A3F', //Orange
      '#DF5A49', //Light Red
      '#5F91B8', //Blue
      '#E2A37F', //Peach
      '#55DBC1', //Light Teal
      '#EFDA97', //Light Yellow
      '#DF948A', //Light Red
    ],
    heatmap: ['#428517', '#77D200', '#D6D305', '#EC8E19', '#C92B05'],
    warm: ['#940031', '#C43343', '#DC5429', '#FF821D', '#FFAF55'],
    cool: ['#2746B9', '#0B69D4', '#2794DB', '#31BB76', '#60E83B'],
    red: ['#FCAE91', '#FB6A4A', '#DE2D26', '#A50F15', '#750B0E'],
    blue: ['#002C61', '#004B8F', '#006BC9', '#3795E5', '#65B4F4'],
    green: ['#354722', '#466631', '#649146', '#8AB25C', '#A9C97E'],
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
