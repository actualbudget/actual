import * as React from 'react';
const SvgDelete = props => (
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
      fill="none"
      stroke="currentColor"
      d="m2 2 20 20M22 2 2 22"
      strokeLinecap="round"
      strokeMiterlimit={10}
      strokeWidth={4}
    />
  </svg>
);
export default SvgDelete;
