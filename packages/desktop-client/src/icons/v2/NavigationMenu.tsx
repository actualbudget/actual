import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgNavigationMenu = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <rect
      width={23}
      height={3}
      x={0.5}
      y={2.5}
      rx={1}
      ry={1}
      fill="currentColor"
    />
    <rect
      width={23}
      height={3}
      x={0.5}
      y={10.5}
      rx={1}
      ry={1}
      fill="currentColor"
    />
    <rect
      width={23}
      height={3}
      x={0.5}
      y={18.5}
      rx={1}
      ry={1}
      fill="currentColor"
    />
  </svg>
);
