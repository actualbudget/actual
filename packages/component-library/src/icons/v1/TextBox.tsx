import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgTextBox = (props: SVGProps<SVGSVGElement>) => (
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
      d="M0 0h6v6H0zm2 2v2h2V2zm12-2h6v6h-6zm2 2v2h2V2zm-2 12h6v6h-6zm2 2v2h2v-2zM0 14h6v6H0zm2 2v2h2v-2zM6 2h8v2H6zm0 14h8v2H6zM16 6h2v8h-2zM2 6h2v8H2zm5 1h6v2H7zm2 2h2v4H9z"
      fill="currentColor"
    />
  </svg>
);
