import * as React from 'react';

const SvgSearchAlternate = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="m23.384 21.619-6.529-6.529a9.284 9.284 0 1 0-1.768 1.768l6.529 6.529a1.266 1.266 0 0 0 1.768 0 1.251 1.251 0 0 0 0-1.768ZM2.75 9.5a6.75 6.75 0 1 1 6.75 6.75A6.758 6.758 0 0 1 2.75 9.5Z"
      fill="currentColor"
    />
  </svg>
);

export default SvgSearchAlternate;
