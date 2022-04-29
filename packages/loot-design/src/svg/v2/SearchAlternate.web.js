import React from 'react';

const SvgSearchAlternate = props => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="M23.384 21.619l-6.529-6.529a9.284 9.284 0 1 0-1.768 1.768l6.529 6.529a1.266 1.266 0 0 0 1.768 0 1.251 1.251 0 0 0 0-1.768zM2.75 9.5a6.75 6.75 0 1 1 6.75 6.75A6.758 6.758 0 0 1 2.75 9.5z"
      fill="currentColor"
    />
  </svg>
);

export default SvgSearchAlternate;
