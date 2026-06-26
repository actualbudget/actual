import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgLibrary = (props: SVGProps<SVGSVGElement>) => (
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
      d="m0 6 10-6 10 6v2H0zm0 12h20v2H0zm2-2h16v2H2zm0-8h4v8H2zm6 0h4v8H8zm6 0h4v8h-4z"
      fill="currentColor"
    />
  </svg>
);
