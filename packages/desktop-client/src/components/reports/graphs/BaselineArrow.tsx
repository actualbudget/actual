import React from 'react';

type BaselineArrowProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  // Whether the amount is above its baseline, so the arrow points up
  isUp: boolean;
};

/**
 * Draws a floating bar as an arrow from its baseline to its amount, with a
 * tick across the baseline end so the start reads clearly.
 */
export function BaselineArrow({
  x,
  y,
  width,
  height,
  fill,
  isUp,
}: BaselineArrowProps) {
  // Recharts can give range bars a negative height
  const top = Math.min(y, y + height);
  const length = Math.abs(height);
  const centre = x + width / 2;
  const base = isUp ? top + length : top;
  const tip = isUp ? top : top + length;
  const direction = isUp ? -1 : 1;

  const shaftWidth = Math.max(width * 0.3, 2);
  const tickHeight = 2;
  const headLength = Math.min(width * 0.5, length * 0.6);
  const headStart = tip - direction * headLength;

  return (
    <g>
      <rect
        x={x}
        y={base - tickHeight / 2}
        width={width}
        height={tickHeight}
        fill={fill}
      />
      {length > 0 && (
        <>
          <rect
            x={centre - shaftWidth / 2}
            y={Math.min(base, headStart)}
            width={shaftWidth}
            height={Math.abs(headStart - base)}
            fill={fill}
          />
          <polygon
            points={`${x},${headStart} ${x + width},${headStart} ${centre},${tip}`}
            fill={fill}
          />
        </>
      )}
    </g>
  );
}
