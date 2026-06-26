import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgBorderTop = (props: SVGProps<SVGSVGElement>) => (
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
      d="M1 1h18v2H1zm0 4h2v2H1zm0 4h2v2H1zm0 4h2v2H1zm0 4h2v2H1zm4-8h2v2H5zm0 8h2v2H5zM9 5h2v2H9zm0 4h2v2H9zm0 4h2v2H9zm0 4h2v2H9zm4-8h2v2h-2zm0 8h2v2h-2zm4-12h2v2h-2zm0 4h2v2h-2zm0 4h2v2h-2zm0 4h2v2h-2z"
      fill="currentColor"
    />
  </svg>
);
