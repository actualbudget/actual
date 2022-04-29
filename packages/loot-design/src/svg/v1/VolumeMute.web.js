import React from 'react';

const SvgVolumeMute = props => (
  <svg
    {...props}
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
