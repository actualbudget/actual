import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgArrowThickUp = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path d="M7 10v8h6v-8h5l-8-8-8 8h5z" fill="currentColor" />
  </svg>
);
