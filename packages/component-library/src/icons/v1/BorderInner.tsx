import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgBorderInner = (props: SVGProps<SVGSVGElement>) => (
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
      d="M9 9V1h2v8h8v2h-8v8H9v-8H1V9zM1 1h2v2H1zm0 4h2v2H1zm0 8h2v2H1zm0 4h2v2H1zM5 1h2v2H5zm0 16h2v2H5zm8-16h2v2h-2zm0 16h2v2h-2zm4-16h2v2h-2zm0 4h2v2h-2zm0 8h2v2h-2zm0 4h2v2h-2z"
      fill="currentColor"
    />
  </svg>
);
