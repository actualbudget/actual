import * as React from 'react';

const SvgPause = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" fill="currentColor" />
  </svg>
);

export default SvgPause;
