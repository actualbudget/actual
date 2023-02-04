import * as React from 'react';

const SvgForwardStep = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M13 5h3v10h-3V5zM4 5l9 5-9 5V5z" fill="currentColor" />
  </svg>
);

export default SvgForwardStep;
