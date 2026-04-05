import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgRefresh = (props: SVGProps<SVGSVGElement>) => (
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
      d="M10 3v2a5 5 0 0 0-3.54 8.54l-1.41 1.41A7 7 0 0 1 10 3m4.95 2.05A7 7 0 0 1 10 17v-2a5 5 0 0 0 3.54-8.54zM10 20l-4-4 4-4zm0-12V0l4 4z"
      fill="currentColor"
    />
  </svg>
);
