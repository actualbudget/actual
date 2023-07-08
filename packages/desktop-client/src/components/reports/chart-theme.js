import { colorsm } from '../../style';

let colorFades = {
  blueFadeStart: 'rgba(44, 192, 144, 1)',
  blueFadeEnd: 'rgba(44, 192, 144, 0)',
  redFadeStart: 'rgba(172, 115, 235, 1)',
  redFadeEnd: 'rgba(172, 115, 235, 0)',
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
  fill: colorsm.pageText,
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

const theme = {
  colors: {
    ...colorFades,
    red: colorsm.pageTextPositive,
    blue: colorsm.noticeText,
  },
  area: {
    style: {
      labels: baseLabelStyles,
      data: {
        stroke: colorsm.noticeText,
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
        stroke: 'rgba(0,0,0,.2)',
        strokeDasharray: '1,1',
      },
      tickLabels: { ...baseLabelStyles, padding: 5 },
    },
  },
  independentAxis: {
    style: {
      ...axisBaseStyles,
      axis: { ...axisBaseStyles.axis, stroke: 'rgba(0,0,0,.2)' },
      tickLabels: { ...baseLabelStyles, padding: 10 },
    },
  },
  bar: {
    style: {
      labels: baseLabelStyles,
      data: { fill: colorsm.noticeText, stroke: 'none' },
    },
  },
  line: {
    style: {
      labels: baseLabelStyles,
      data: {
        fill: 'none',
        stroke: colorsm.tableHeaderText,
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
export default theme;
