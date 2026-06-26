import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgBorderOuter = (props: SVGProps<SVGSVGElement>) => (
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
      d="M2 19H1V1h18v18zm1-2h14V3H3zm10-8h2v2h-2zM9 9h2v2H9zM5 9h2v2H5zm4-4h2v2H9zm0 8h2v2H9z"
      fill="currentColor"
    />
  </svg>
);
