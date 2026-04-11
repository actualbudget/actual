import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgCheveronOutlineUp = (props: SVGProps<SVGSVGElement>) => (
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
      d="M0 10a10 10 0 1 1 20 0 10 10 0 0 1-20 0m10 8a8 8 0 1 0 0-16 8 8 0 0 0 0 16m.7-10.54L14.25 11l-1.41 1.41L10 9.6l-2.83 2.8L5.76 11 10 6.76z"
      fill="currentColor"
    />
  </svg>
);
