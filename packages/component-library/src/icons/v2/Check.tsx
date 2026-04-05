import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgCheck = (props: SVGProps<SVGSVGElement>) => (
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
      d="M6.847 21.429a3.4 3.4 0 0 1-2.662-1.34l-3.76-4.273a1.714 1.714 0 0 1 2.572-2.263l3.522 4.01a.43.43 0 0 0 .631.014L21.036 3.105a1.715 1.715 0 1 1 2.486 2.362l-14.06 14.8a3.33 3.33 0 0 1-2.615 1.162"
    />
  </svg>
);
