import React from 'react';

const SvgFilter = props => (
  <svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M12 12l8-8V0H0v4l8 8v8l4-4v-4z" fill="currentColor" />
  </svg>
);

export default SvgFilter;
