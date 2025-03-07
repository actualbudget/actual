import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgSplit = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 32 32"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeMiterlimit={10}
      strokeWidth={3.5}
      d="m30 9-4-4M30 9l-4 4M6 5 2 9M2 9l4 4M10 9H3M22 9h7M16 15l6-6M16 15l-6-6M16 28V15"
    />
  </svg>
);
