import * as React from 'react';

const SvgVolumeMute = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M9 7H5v6h4l5 5V2L9 7z" fill="currentColor" />
  </svg>
);

export default SvgVolumeMute;
