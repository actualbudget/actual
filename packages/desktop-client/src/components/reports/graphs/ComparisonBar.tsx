import React from 'react';

type ComparisonBarProps = {
  // The bar Recharts lays out, spanning every value drawn in it
  x: number;
  y: number;
  width: number;
  height: number;
  range: [number, number];
  comparison: number;
  amount: number;
  fill: string;
  opacity?: number;
  // Opens the comparison's transactions instead of the bar's own
  onComparisonClick?: () => void;
};

/**
 * Draws a faint bar from zero to the comparison, with a narrower bar in front
 * for the amount.
 */
export function ComparisonBar({
  x,
  y,
  width,
  height,
  range: [low, high],
  comparison,
  amount,
  fill,
  opacity = 1,
  onComparisonClick,
}: ComparisonBarProps) {
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
        {...span(0, comparison)}
        fill={fill}
        fillOpacity={0.3}
        onClick={
          onComparisonClick &&
          (event => {
            event.stopPropagation();
            onComparisonClick();
          })
        }
      />
      <rect
        x={x + (width - innerWidth) / 2}
        width={innerWidth}
        {...span(0, amount)}
        fill={fill}
      />
    </g>
  );
}
