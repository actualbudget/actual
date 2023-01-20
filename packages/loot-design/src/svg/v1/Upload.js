import * as React from 'react';

const SvgUpload = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M13 10v6H7v-6H2l8-8 8 8h-5zM0 18h20v2H0v-2z" fill="currentColor" />
  </svg>
);

export default SvgUpload;
