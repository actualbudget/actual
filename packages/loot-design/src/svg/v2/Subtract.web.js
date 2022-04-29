import React from 'react';

const SvgSubtract = props => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="M1.5 13.5h21a1.5 1.5 0 0 0 0-3h-21a1.5 1.5 0 0 0 0 3z"
      fill="currentColor"
    />
  </svg>
);

export default SvgSubtract;
