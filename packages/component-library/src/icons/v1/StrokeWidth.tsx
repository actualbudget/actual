import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgStrokeWidth = (props: SVGProps<SVGSVGElement>) => (
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
      d="M0 0h20v5H0zm0 7h20v4H0zm0 6h20v3H0zm0 5h20v2H0z"
      fill="currentColor"
    />
  </svg>
);
