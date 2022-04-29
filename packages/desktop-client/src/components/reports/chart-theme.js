import { colors } from 'loot-design/src/style';

let colorFades = {
  blueFadeStart: 'rgba(229, 245, 255, 1)',
  blueFadeEnd: 'rgba(229, 245, 255, 0)',
  redFadeStart: 'rgba(255, 243, 242, 1)',
  redFadeEnd: 'rgba(255, 243, 242, 0)'
};

// Typography
const sansSerif =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", "Helvetica", "Arial", sans-serif';
const letterSpacing = 'normal';
const fontSize = 13;

// Labels
const baseLabelStyles = {
  fontFamily: sansSerif,
  fontSize,
  letterSpacing,
  fill: colors.n1,
  stroke: 'transparent'
};

export default {
  colors: {
    ...colorFades,
    red: colors.r7,
    blue: colors.b6
  },
  area: {
    style: {
      data: {
        stroke: colors.b6,
        strokeWidth: 2,
        strokeLinejoin: 'round',
        strokeLinecap: 'round'
      }
    }
  },
  axis: {
    style: {
      axis: {
        fill: 'transparent',
        stroke: 'none'
      },
      grid: {
        fill: 'none',
        stroke: 'none',
        pointerEvents: 'none'
      },
      ticks: {
        fill: 'transparent',
        size: 1,
        stroke: 'none'
      },
      tickLabels: baseLabelStyles
    }
  },
  dependentAxis: {
    style: {
      grid: { stroke: 'rgba(0,0,0,.2)', strokeDasharray: '1,1' },
      tickLabels: { padding: 5 }
    }
  },
  independentAxis: {
    style: {
      axis: { stroke: 'rgba(0,0,0,.2)' },
      tickLabels: { padding: 10 }
    }
  },
  bar: {
    style: {
      data: { fill: colors.b6, stroke: 'none' }
    }
  },
  line: {
    style: {
      data: {
        fill: 'none',
        stroke: colors.b6,
        strokeWidth: 2,
        strokeLinejoin: 'round',
        strokeLinecap: 'round'
      }
    }
  },
  chart: {
    padding: {
      top: 20,
      left: 65,
      right: 20,
      bottom: 50
    }
  }
};
