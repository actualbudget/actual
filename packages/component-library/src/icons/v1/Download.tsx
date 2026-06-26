import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgDownload = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path d="M13 8V2H7v6H2l8 8 8-8zM0 18h20v2H0z" fill="currentColor" />
  </svg>
);
