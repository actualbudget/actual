import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgChartSankey = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path
      d="M8.1 24H0V0h8v12c.1 0 1.2-.1 1.8-1.4.9-1.9 2.6-7.8 2.6-7.9.2-.9 1.3-2.7 3.6-2.7v2c-1.3 0-1.7 1.2-1.7 1.3-.1.3-1.8 6.1-2.7 8.1C10.4 14 8.1 14 8 14v4s1.2 0 1.8-1c.8-1.4 2.6-5.8 2.6-5.9.4-.8 1.5-2.1 3.6-2.1v2c-1.3 0-1.7.8-1.8.9 0 .1-1.8 4.5-2.7 6.1-1.2 2-3.4 2-3.5 2v2c.5 0 1.5-.1 1.9-.6.8-.8 2.5-2.9 2.5-2.9.1-.1 1.1-1.5 3.6-1.5v2c-1.4 0-2 .7-2 .7-.1.1-1.7 2.2-2.6 3.1-1 1.1-2.5 1.2-3.3 1.2M2 22h4v-8H2zm0-10h4V2H2zm22 12h-8V0h8zm-6-2h4v-3h-4zm0-5h4v-6h-4zm0-8h4V2h-4z"
      fill="currentColor"
    />
  </svg>
);
