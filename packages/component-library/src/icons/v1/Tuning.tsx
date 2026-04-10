import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgTuning = (props: SVGProps<SVGSVGElement>) => (
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
      d="M17 16v4h-2v-4h-2v-3h6v3zM1 9h6v3H1zm6-4h6v3H7zM3 0h2v8H3zm12 0h2v12h-2zM9 0h2v4H9zM3 12h2v8H3zm6-4h2v12H9z"
      fill="currentColor"
    />
  </svg>
);
