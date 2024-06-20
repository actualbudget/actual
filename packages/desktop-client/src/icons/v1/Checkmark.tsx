import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgCheckmark = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path d="m0 11 2-2 5 5L18 3l2 2L7 18z" fill="currentColor" />
  </svg>
);
