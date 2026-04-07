import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgListAdd = (props: SVGProps<SVGSVGElement>) => (
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
      d="M15 9h-3v2h3v3h2v-3h3V9h-3V6h-2zM0 3h10v2H0zm0 8h10v2H0zm0-4h10v2H0zm0 8h10v2H0z"
      fill="currentColor"
    />
  </svg>
);
