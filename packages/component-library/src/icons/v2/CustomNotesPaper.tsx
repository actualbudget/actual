import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgCustomNotesPaper = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 19 24"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path
      fill="currentColor"
      d="M17 24H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h9a1 1 0 0 1 .707.293l7 7A1 1 0 0 1 19 8v14a2 2 0 0 1-2 2ZM2 21.5a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 .5-.5V9a.5.5 0 0 0-.5-.5h-4a2 2 0 0 1-2-2v-4A.5.5 0 0 0 10 2H2.5a.5.5 0 0 0-.5.5v19Z"
    />
  </svg>
);
