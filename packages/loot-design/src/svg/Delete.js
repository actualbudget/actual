import * as React from 'react';

const SvgDelete = props => (
  <svg
    {...props}
    width={24}
    height={24}
    xmlns="http://www.w3.org/2000/svg"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      fill="none"
      stroke="#000"
      strokeWidth={4}
      strokeLinecap="round"
      strokeMiterlimit={10}
      d="m2 2 20 20M22 2 2 22"
    />
  </svg>
);

export default SvgDelete;
