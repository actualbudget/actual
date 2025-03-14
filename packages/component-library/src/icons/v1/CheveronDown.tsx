import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgCheveronDown = (props: SVGProps<SVGSVGElement>) => (
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
      d="m9.293 12.95.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"
      fill="currentColor"
    />
  </svg>
);
