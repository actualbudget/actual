import { theme } from '@actual-app/components/theme';

import { useIsTestEnv } from '@desktop-client/hooks/useIsTestEnv';

const colorFades = {
  blueFadeStart: 'rgba(229, 245, 255, 1)',
  blueFadeEnd: 'rgba(229, 245, 255, 0)',
  redFadeStart: 'rgba(255, 243, 242, 1)',
  redFadeEnd: 'rgba(255, 243, 242, 0)',
};

// Typography
const sansSerif =
  'Inter var, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, Helvetica, Arial, sans-serif';
const letterSpacing = 'normal';
const fontSize = 13;

// Labels
const baseLabelStyles = {
  fontFamily: sansSerif,
  fontSize,
  letterSpacing,
  fill: theme.reportsLabel,
  stroke: 'transparent',
};

const axisBaseStyles = {
  axis: {
    fill: 'transparent',
    stroke: 'none',
  },
  grid: {
    fill: 'none',
    stroke: 'none',
    pointerEvents: 'none',
  },
  ticks: {
    fill: 'transparent',
    size: 1,
    stroke: 'none',
  },
  axisLabel: baseLabelStyles,
  tickLabels: baseLabelStyles,
};

export const chartTheme = {
  colors: {
    ...colorFades,
    red: theme.reportsRed,
    blue: theme.reportsBlue,
  },
  area: {
    style: {
      labels: baseLabelStyles,
      data: {
        stroke: theme.reportsBlue,
        strokeWidth: 2,
        strokeLinejoin: 'round',
        strokeLinecap: 'round',
      },
    },
  },
  axis: {
    style: axisBaseStyles,
  },
  dependentAxis: {
    style: {
      ...axisBaseStyles,
      grid: {
        ...axisBaseStyles.grid,
        stroke: theme.pageTextSubdued,
        strokeDasharray: '1,1',
      },
      tickLabels: { ...baseLabelStyles, padding: 5 },
    },
  },
  independentAxis: {
    style: {
      ...axisBaseStyles,
      axis: { ...axisBaseStyles.axis, stroke: theme.pageTextSubdued },
      tickLabels: { ...baseLabelStyles, padding: 10 },
    },
  },
  bar: {
    style: {
      labels: baseLabelStyles,
      data: { fill: theme.reportsBlue, stroke: 'none' },
    },
  },
  line: {
    style: {
      labels: baseLabelStyles,
      data: {
        fill: 'none',
        stroke: theme.reportsBlue,
        strokeWidth: 2,
        strokeLinejoin: 'round',
        strokeLinecap: 'round',
      },
    },
  },
  voronoi: {
    style: {
      labels: baseLabelStyles,
    },
  },
  chart: {
    padding: {
      top: 20,
      left: 65,
      right: 20,
      bottom: 50,
    },
  },
};

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
