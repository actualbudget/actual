import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgKeyboard = (props: SVGProps<SVGSVGElement>) => (
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
      d="M0 6c0-1.1.9-2 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2 0v2h2V6zm1 3v2h2V9zm-1 3v2h2v-2zm3 0v2h10v-2zm11 0v2h2v-2zM6 9v2h2V9zm3 0v2h2V9zm3 0v2h2V9zm3 0v2h2V9zM5 6v2h2V6zm3 0v2h2V6zm3 0v2h2V6zm3 0v2h4V6z"
      fill="currentColor"
    />
  </svg>
);
