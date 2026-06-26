import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgAlignCenter = (props: SVGProps<SVGSVGElement>) => (
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
      d="M1 1h18v2H1zm0 8h18v2H1zm0 8h18v2H1zM4 5h12v2H4zm0 8h12v2H4z"
      fill="currentColor"
    />
  </svg>
);
