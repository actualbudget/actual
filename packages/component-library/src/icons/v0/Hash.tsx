import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgHash = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path fill="none" d="M0 0h24v24H0z" />
    <g
      fill="none"
      stroke="currentColor"
      strokeDashoffset={0}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <g strokeDasharray={20}>
        <path d="M4 9h17M3 15h17" fill="currentColor" />
      </g>
      <g strokeDasharray={22}>
        <path d="M10 3 8 21M16 3l-2 18" fill="currentColor" />
      </g>
    </g>
  </svg>
);
