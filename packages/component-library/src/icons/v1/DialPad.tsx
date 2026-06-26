import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgDialPad = (props: SVGProps<SVGSVGElement>) => (
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
      d="M5 4a2 2 0 1 1 0-4 2 2 0 0 1 0 4m5 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4m5 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4M5 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4m5 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4m5 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4M5 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4m5 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4m0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4m5-6a2 2 0 1 1 0-4 2 2 0 0 1 0 4"
      fill="currentColor"
    />
  </svg>
);
