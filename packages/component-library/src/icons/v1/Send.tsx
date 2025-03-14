import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgSend = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path d="m0 0 20 10L0 20V0zm0 8v4l10-2L0 8z" fill="currentColor" />
  </svg>
);
