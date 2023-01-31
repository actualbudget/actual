import * as React from 'react';

const SvgForward = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="m1 5 9 5-9 5V5zm9 0 9 5-9 5V5z" fill="currentColor" />
  </svg>
);

export default SvgForward;
