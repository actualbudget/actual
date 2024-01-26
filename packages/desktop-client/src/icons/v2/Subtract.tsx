import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgSubtract = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path
      d="M1.5 13.5h21a1.5 1.5 0 0 0 0-3h-21a1.5 1.5 0 0 0 0 3Z"
      fill="currentColor"
    />
  </svg>
);
