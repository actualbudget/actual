import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgPrinter = (props: SVGProps<SVGSVGElement>) => (
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
      d="M4 16H0V6h20v10h-4v4H4zm2-4v6h8v-6zM4 0h12v5H4zM2 8v2h2V8zm4 0v2h2V8z"
      fill="currentColor"
    />
  </svg>
);
