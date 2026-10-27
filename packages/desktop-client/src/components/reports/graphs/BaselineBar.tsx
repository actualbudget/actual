import React from 'react';

type BaselineBarProps = {
  // The bar Recharts lays out, spanning every value drawn in it
  x: number;
  y: number;
  width: number;
  height: number;
  range: [number, number];
  baseline: number;
  amount: number;
  changeFromBaseline: boolean;
  fill: string;
  opacity?: number;
};

/**
 * Draws a faint bar from zero to the baseline, with a narrower bar in front
 * for the amount, or for only its change from the baseline.
 */
export function BaselineBar({
  x,
  y,
  width,
  height,
  range: [low, high],
  baseline,
  amount,
  changeFromBaseline,
  fill,
  opacity = 1,
}: BaselineBarProps) {
  // Recharts can give range bars a negative height
  const top = Math.min(y, y + height);
  const length = Math.abs(height);
  const toPixel = (value: number) =>
    high === low ? top : top + ((high - value) / (high - low)) * length;
  const span = (from: number, to: number) => ({
    y: Math.min(toPixel(from), toPixel(to)),
    height: Math.abs(toPixel(from) - toPixel(to)),
  });

  const innerWidth = width / 2;

  return (
    <g opacity={opacity}>
      <rect
        x={x}
        width={width}
        {...span(0, baseline)}
        fill={fill}
        fillOpacity={0.3}
      />
      <rect
        x={x + (width - innerWidth) / 2}
        width={innerWidth}
        {...span(changeFromBaseline ? baseline : 0, amount)}
        fill={fill}
      />
    </g>
  );
}
