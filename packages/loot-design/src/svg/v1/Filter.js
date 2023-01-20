import * as React from 'react';

const SvgFilter = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="m12 12 8-8V0H0v4l8 8v8l4-4v-4z" fill="currentColor" />
  </svg>
);

export default SvgFilter;
