import * as React from 'react';

const SvgFlag = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="M7.667 12H2v8H0V0h12l.333 2H20l-3 6 3 6H8l-.333-2z"
      fill="currentColor"
    />
  </svg>
);

export default SvgFlag;
