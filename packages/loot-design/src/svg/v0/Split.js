import * as React from 'react';

const SvgSplit = props => (
  <svg
    {...props}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="m30 9-4-4M30 9l-4 4M6 5 2 9M2 9l4 4M10 9H3M22 9h7M16 15l6-6M16 15l-6-6M16 28V15"
      stroke="#000"
      strokeWidth={3.5}
      strokeMiterlimit={10}
      strokeLinecap="round"
      fill="currentColor"
    />
  </svg>
);

export default SvgSplit;
