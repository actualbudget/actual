import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgSubdirectoryRight = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path d="M3.5 13H12v5l6-6-6-6v5H4V2H2v11z" fill="currentColor" />
  </svg>
);
