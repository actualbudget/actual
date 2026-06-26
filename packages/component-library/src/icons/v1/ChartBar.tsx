import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgChartBar = (props: SVGProps<SVGSVGElement>) => (
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
      d="M1 10h3v10H1zM6 0h3v20H6zm5 8h3v12h-3zm5-4h3v16h-3z"
      fill="currentColor"
    />
  </svg>
);
