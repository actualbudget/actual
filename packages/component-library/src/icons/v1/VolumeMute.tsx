import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgVolumeMute = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path d="M9 7H5v6h4l5 5V2L9 7z" fill="currentColor" />
  </svg>
);
