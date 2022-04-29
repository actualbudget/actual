import React from 'react';

const SvgCheckmark = props => (
  <svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" fill="currentColor" />
  </svg>
);

export default SvgCheckmark;
