import React from 'react';

const SvgFactory = props => (
  <svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="M10.5 20H0V7l5 3.33V7l5 3.33V7l5 3.33V0h5v20h-9.5z"
      fill="currentColor"
    />
  </svg>
);

export default SvgFactory;
