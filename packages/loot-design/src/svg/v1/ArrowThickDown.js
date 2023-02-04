import * as React from 'react';

const SvgArrowThickDown = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M7 10V2h6v8h5l-8 8-8-8h5z" fill="currentColor" />
  </svg>
);

export default SvgArrowThickDown;
