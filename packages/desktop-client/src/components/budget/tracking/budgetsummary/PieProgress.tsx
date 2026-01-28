import React from 'react';
import type { SVGProps } from 'react';

type PieProgressProps = {
  style?: SVGProps<SVGSVGElement>['style'];
  progress: number;
  color: string;
  backgroundColor: string;
};
export function PieProgress({
  style,
  progress,
  color,
  backgroundColor,
}: PieProgressProps) {
  const radius = 4;
  const circum = 2 * Math.PI * radius;
  const dash = progress * circum;
  const gap = circum;

  return (
    <svg viewBox="0 0 20 20" style={style}>
      <circle r="10" cx="10" cy="10" fill={backgroundColor} />
      <circle
        r={radius}
        cx="10"
        cy="10"
        fill="none"
        stroke={color}
        strokeWidth={radius * 2}
        strokeDasharray={`${dash} ${gap}`}
        transform="rotate(-90) translate(-20)"
      />{' '}
    </svg>
  );
}
