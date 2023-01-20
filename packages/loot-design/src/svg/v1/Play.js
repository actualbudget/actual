import * as React from 'react';

const SvgPlay = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="m4 4 12 6-12 6z" fill="currentColor" />
  </svg>
);

export default SvgPlay;
