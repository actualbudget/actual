import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgMerge = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 32 32"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeMiterlimit={10}
      strokeWidth={3.5}
      d="M24 29h5.333M8 29H2.667M16 21l-8 8M16 21l8 8M16 2.667v18.666M16 2.667 8 9.333M16 2.667l8 6.666"
    />
  </svg>
);
