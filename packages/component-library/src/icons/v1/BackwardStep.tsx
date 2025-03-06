import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgBackwardStep = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path d="M4 5h3v10H4V5zm12 0v10l-9-5 9-5z" fill="currentColor" />
  </svg>
);
