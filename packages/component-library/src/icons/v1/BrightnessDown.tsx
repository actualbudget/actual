import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgBrightnessDown = (props: SVGProps<SVGSVGElement>) => (
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
      d="M10 13a3 3 0 1 1 0-6 3 3 0 0 1 0 6M9 4a1 1 0 1 1 2 0 1 1 0 1 1-2 0m4.54 1.05a1 1 0 1 1 1.41 1.41 1 1 0 1 1-1.41-1.41M16 9a1 1 0 1 1 0 2 1 1 0 1 1 0-2m-1.05 4.54a1 1 0 1 1-1.41 1.41 1 1 0 1 1 1.41-1.41M11 16a1 1 0 1 1-2 0 1 1 0 1 1 2 0m-4.54-1.05a1 1 0 1 1-1.41-1.41 1 1 0 1 1 1.41 1.41M4 11a1 1 0 1 1 0-2 1 1 0 1 1 0 2m1.05-4.54a1 1 0 1 1 1.41-1.41 1 1 0 1 1-1.41 1.41"
      fill="currentColor"
    />
  </svg>
);
