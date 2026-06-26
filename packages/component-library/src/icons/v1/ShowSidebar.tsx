import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgShowSidebar = (props: SVGProps<SVGSVGElement>) => (
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
      d="M7 3H2v14h5zm2 0v14h9V3zM0 3c0-1.1.9-2 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm3 1h3v2H3zm0 3h3v2H3zm0 3h3v2H3z"
      fill="currentColor"
    />
  </svg>
);
