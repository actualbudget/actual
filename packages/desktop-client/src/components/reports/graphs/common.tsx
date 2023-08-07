import * as d from 'date-fns';

import theme from '../chart-theme';

type AreaProps = {
  start: string;
  end: string;
  scale?;
  range?;
};
export function Area({ start, end, scale, range }: AreaProps) {
  const zero = scale.y(0);

  const startX = scale.x(d.parseISO(start + '-01'));
  const endX = scale.x(d.parseISO(end + '-01'));

  if (startX < 0 || endX < 0) {
    return null;
  }

  return (
    <svg>
      <defs>
        <clipPath id="positive">
          <rect
            x={startX}
            y={range.y[1]}
            width={endX - startX}
            height={zero - range.y[1] + 1}
            fill="#ffffff"
          />
        </clipPath>
        <clipPath id="negative">
          <rect
            x={startX}
            y={zero + 1}
            width={endX - startX}
            height={Math.max(range.y[0] - zero - 1, 0)}
            fill="#ffffff"
          />
        </clipPath>
        <linearGradient
          id="positive-gradient"
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={range.y[1]}
          x2={0}
          y2={zero}
        >
          <stop offset="0%" stopColor={theme.colors.blueFadeStart} />
          <stop offset="100%" stopColor={theme.colors.blueFadeEnd} />
        </linearGradient>
        <linearGradient
          id="negative-gradient"
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={zero}
          x2={0}
          y2={range.y[0]}
        >
          <stop offset="0%" stopColor={theme.colors.redFadeEnd} />
          <stop offset="100%" stopColor={theme.colors.redFadeStart} />
        </linearGradient>
      </defs>
    </svg>
  );
}
