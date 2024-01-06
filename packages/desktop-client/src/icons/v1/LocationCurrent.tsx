import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgLocationCurrent = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path d="m0 0 20 8-8 4-2 8z" fill="currentColor" />
  </svg>
);
