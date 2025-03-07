import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgSum = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 28.3 28.3"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path
      d="M23.2,10.1c1.1,0,2-0.9,2-2V2.2c0-1.1-0.9-2-2-2h-18c-1.1,0-2,0.9-2,2c0,0.4,0.1,0.9,0.4,1.2l8.1,10.8L3.6,25
		c-0.7,0.9-0.5,2.1,0.4,2.8c0.3,0.3,0.8,0.4,1.2,0.4h18c1.1,0,2-0.9,2-2v-5.8c0-1.1-0.9-2-2-2s-2,0.9-2,2v3.8h-12l6.6-8.8
		c0.5-0.7,0.5-1.7,0-2.4L9.2,4.2h12v3.9C21.2,9.2,22.1,10.1,23.2,10.1z"
      fill="currentColor"
    />
  </svg>
);
