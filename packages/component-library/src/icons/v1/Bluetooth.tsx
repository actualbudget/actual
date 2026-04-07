import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgBluetooth = (props: SVGProps<SVGSVGElement>) => (
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
      d="m9.41 0 6 6-4 4 4 4-6 6H9v-7.59l-3.3 3.3-1.4-1.42L8.58 10l-4.3-4.3L5.7 4.3 9 7.58V0zM11 4.41V7.6L12.59 6zM12.59 14 11 12.41v3.18z"
      fill="currentColor"
    />
  </svg>
);
