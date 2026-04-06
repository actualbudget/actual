import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgNotificationsOutline = (props: SVGProps<SVGSVGElement>) => (
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
      d="M6 8v7h8V8a4 4 0 1 0-8 0m2.03-5.67a2 2 0 1 1 3.95 0A6 6 0 0 1 16 8v6l3 2v1H1v-1l3-2V8a6 6 0 0 1 4.03-5.67M12 18a2 2 0 1 1-4 0z"
      fill="currentColor"
    />
  </svg>
);
