import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgQueue = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path d="M0 2h20v4H0zm0 8h20v2H0zm0 6h20v2H0z" fill="currentColor" />
  </svg>
);
