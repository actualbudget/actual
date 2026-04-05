import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgViewColumn = (props: SVGProps<SVGSVGElement>) => (
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
      d="M12 4H8v12h4zm2 0v12h4V4zM6 4H2v12h4zM0 2h20v16H0z"
      fill="currentColor"
    />
  </svg>
);
