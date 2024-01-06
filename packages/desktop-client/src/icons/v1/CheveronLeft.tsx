import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgCheveronLeft = (props: SVGProps<SVGSVGElement>) => (
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
      d="M7.05 9.293 6.343 10 12 15.657l1.414-1.414L9.172 10l4.242-4.243L12 4.343z"
      fill="currentColor"
    />
  </svg>
);
