import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgArrowThickRight = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path d="M10 7H2v6h8v5l8-8-8-8v5z" fill="currentColor" />
  </svg>
);
