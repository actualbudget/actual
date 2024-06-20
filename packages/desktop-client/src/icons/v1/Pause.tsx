import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgPause = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" fill="currentColor" />
  </svg>
);
