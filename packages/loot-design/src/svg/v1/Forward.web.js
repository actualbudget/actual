import React from 'react';

const SvgForward = props => (
  <svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M1 5l9 5-9 5V5zm9 0l9 5-9 5V5z" fill="currentColor" />
  </svg>
);

export default SvgForward;
