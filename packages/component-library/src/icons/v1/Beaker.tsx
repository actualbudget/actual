import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgBeaker = (props: SVGProps<SVGSVGElement>) => (
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
      d="M12 1H8a1 1 0 0 0 0 2v4.586l-5.707 5.707A2.5 2.5 0 0 0 4.06 17.5h11.88a2.5 2.5 0 0 0 1.767-4.207L12 7.586V3a1 1 0 0 0 0-2m-2 2v5a1 1 0 0 0 .293.707l2.5 2.5H7.207l2.5-2.5A1 1 0 0 0 10 8z"
      fill="currentColor"
    />
  </svg>
);
