import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgCheveronUp = (props: SVGProps<SVGSVGElement>) => (
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
      d="M10.707 7.05 10 6.343 4.343 12l1.414 1.414L10 9.172l4.243 4.242L15.657 12z"
      fill="currentColor"
    />
  </svg>
);
