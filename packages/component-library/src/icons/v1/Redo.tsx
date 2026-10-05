import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgRedo = (props: SVGProps<SVGSVGElement>) => (
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
      d="M5 17v-2.99A4 4 0 0 1 9 10h3v5l6-6-6-6v5H9a6 6 0 0 0-6 6v3z"
      fill="currentColor"
    />
  </svg>
);
