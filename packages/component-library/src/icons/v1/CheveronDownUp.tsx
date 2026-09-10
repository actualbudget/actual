import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgCheveronDownUp = (props: SVGProps<SVGSVGElement>) => (
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
      d="M10 8.24 4.99 3.23 6.42 1.8 10 5.38l3.58-3.58 1.43 1.43zm0 3.52 5.01 5.01-1.43 1.43L10 14.62 6.42 18.2l-1.43-1.43z"
      fill="currentColor"
    />
  </svg>
);
