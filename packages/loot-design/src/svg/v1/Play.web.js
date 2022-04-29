import React from 'react';

const SvgPlay = props => (
  <svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M4 4l12 6-12 6z" fill="currentColor" />
  </svg>
);

export default SvgPlay;
