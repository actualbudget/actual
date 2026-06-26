import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgArrowOutlineUp = (props: SVGProps<SVGSVGElement>) => (
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
      d="M10 0a10 10 0 1 1 0 20 10 10 0 0 1 0-20m0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16m2 8v5H8v-5H5l5-5 5 5z"
      fill="currentColor"
    />
  </svg>
);
