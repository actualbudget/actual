import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgCheveronUpDown = (props: SVGProps<SVGSVGElement>) => (
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
      d="m10 3.5 4.95 4.95-1.414 1.414L10 6.328 6.464 9.864 5.05 8.45zm0 13-4.95-4.95 1.414-1.414L10 13.672l3.536-3.536 1.414 1.414z"
      fill="currentColor"
    />
  </svg>
);
