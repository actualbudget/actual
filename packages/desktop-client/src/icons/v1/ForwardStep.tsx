import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgForwardStep = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path d="M13 5h3v10h-3V5zM4 5l9 5-9 5V5z" fill="currentColor" />
  </svg>
);
