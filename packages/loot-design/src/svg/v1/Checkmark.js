import * as React from 'react';

const SvgCheckmark = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="m0 11 2-2 5 5L18 3l2 2L7 18z" fill="currentColor" />
  </svg>
);

export default SvgCheckmark;
