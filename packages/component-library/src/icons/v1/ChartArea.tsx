import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgChartArea = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path
      d="M 2.5 13 C 2 13.5 2 13.5 2 14 V 15 C 2 16 2 16 3 16 L 17 16 C 18 16 18 16 18 15 V 8.5 C 18 8 18 8 17.5 7.5 L 16 6 C 15.5 5.6 15.5 5.6 15 6 L 11 10 C 10.5 10.25 10.5 10.25 10 10 L 8 9 C 7.5 8.7 7.5 8.7 7 9 z M 0 5 c 0 -1.1 0.9 -2 2 -2 h 16 a 2 2 0 0 1 2 2 v 12 a 2 2 0 0 1 -2 2 H 2 a 2 2 0 0 1 -2 -2 V 4 z"
      fill="currentColor"
    />
  </svg>
);
