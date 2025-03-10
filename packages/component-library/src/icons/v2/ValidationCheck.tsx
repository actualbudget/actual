import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgValidationCheck = (props: SVGProps<SVGSVGElement>) => (
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
      fill="currentColor"
      d="M7.176 22.5a4.111 4.111 0 0 1-3.17-1.486l-3.62-4.6a1.8 1.8 0 1 1 2.828-2.228l3.6 4.56a.384.384 0 0 0 .379.152.52.52 0 0 0 .408-.197L20.794 2.177a1.8 1.8 0 1 1 2.812 2.246L10.39 20.964A4.12 4.12 0 0 1 7.2 22.5Z"
    />
  </svg>
);
