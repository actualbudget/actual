import * as React from 'react';

const SvgCompose = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="M2 4v14h14v-6l2-2v10H0V2h10L8 4H2zm10.3-.3 4 4L8 16H4v-4l8.3-8.3zm1.4-1.4L16 0l4 4-2.3 2.3-4-4z"
      fill="currentColor"
    />
  </svg>
);

export default SvgCompose;
