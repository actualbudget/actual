import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgFormatItalic = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path d="M8 1h9v2H8zm3 2h3L8 17H5zM2 17h9v2H2z" fill="currentColor" />
  </svg>
);
