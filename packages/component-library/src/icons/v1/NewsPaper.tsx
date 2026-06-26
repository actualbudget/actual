import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgNewsPaper = (props: SVGProps<SVGSVGElement>) => (
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
      d="M16 2h4v15a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V0h16zm0 2v13a1 1 0 0 0 1 1 1 1 0 0 0 1-1V4zM2 2v15a1 1 0 0 0 1 1h11.17a3 3 0 0 1-.17-1V2zm2 8h8v2H4zm0 4h8v2H4zM4 4h8v4H4z"
      fill="currentColor"
    />
  </svg>
);
