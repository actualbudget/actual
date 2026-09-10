import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgCheveronUpDown = (props: SVGProps<SVGSVGElement>) => (
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
      d="m10 1.8 5.01 5.01-1.43 1.43L10 4.66 6.42 8.24 4.99 6.81zm0 16.4-5.01-5.01 1.43-1.43L10 15.34l3.58-3.58 1.43 1.43z"
      fill="currentColor"
    />
  </svg>
);
