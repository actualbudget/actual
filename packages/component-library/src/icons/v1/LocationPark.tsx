import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgLocationPark = (props: SVGProps<SVGSVGElement>) => (
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
      d="M5.33 12.77A4 4 0 1 1 3 5.13V5a4 4 0 0 1 5.71-3.62 3.5 3.5 0 0 1 6.26 1.66 2.5 2.5 0 0 1 2 2.08 4 4 0 1 1-2.7 7.49A5 5 0 0 1 12 14.58V18l2 1v1H6v-1l2-1v-3zM5 10l3 3v-3z"
      fill="currentColor"
    />
  </svg>
);
