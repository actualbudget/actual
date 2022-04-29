import React from 'react';

const SvgBackwardStep = props => (
  <svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M4 5h3v10H4V5zm12 0v10l-9-5 9-5z" fill="currentColor" />
  </svg>
);

export default SvgBackwardStep;
