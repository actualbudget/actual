import React from 'react';

const SvgLocationCurrent = props => (
  <svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M0 0l20 8-8 4-2 8z" fill="currentColor" />
  </svg>
);

export default SvgLocationCurrent;
