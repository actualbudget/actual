import React from 'react';

const SvgMinusSolid = props => (
  <svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="M10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm5-11H5v2h10V9z"
      fill="currentColor"
    />
  </svg>
);

export default SvgMinusSolid;
