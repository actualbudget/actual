import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgViewTile = (props: SVGProps<SVGSVGElement>) => (
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
      d="M0 0h9v9H0zm2 2v5h5V2zm-2 9h9v9H0zm2 2v5h5v-5zm9-13h9v9h-9zm2 2v5h5V2zm-2 9h9v9h-9zm2 2v5h5v-5z"
      fill="currentColor"
    />
  </svg>
);
