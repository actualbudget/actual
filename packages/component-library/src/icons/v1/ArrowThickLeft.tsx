import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgArrowThickLeft = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path d="M10 13h8V7h-8V2l-8 8 8 8z" fill="currentColor" />
  </svg>
);
