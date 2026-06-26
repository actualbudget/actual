import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgLightBulb = (props: SVGProps<SVGSVGElement>) => (
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
      d="M7 13.33a7 7 0 1 1 6 0V16H7zM7 17h6v1.5c0 .83-.67 1.5-1.5 1.5h-3A1.5 1.5 0 0 1 7 18.5zm2-5.1V14h2v-2.1a5 5 0 1 0-2 0"
      fill="currentColor"
    />
  </svg>
);
