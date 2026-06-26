import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgInboxFull = (props: SVGProps<SVGSVGElement>) => (
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
      d="M14 14h4V2H2v12h4c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2M0 2C0 .9.9 0 2 0h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm4 2h12v2H4zm0 3h12v2H4zm0 3h12v2H4z"
      fill="currentColor"
    />
  </svg>
);
