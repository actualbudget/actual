import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgListBullet = (props: SVGProps<SVGSVGElement>) => (
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
      d="M1 4h2v2H1zm4 0h14v2H5zM1 9h2v2H1zm4 0h14v2H5zm-4 5h2v2H1zm4 0h14v2H5z"
      fill="currentColor"
    />
  </svg>
);
