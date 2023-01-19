import * as React from 'react';

const SvgSubtract = props => (
  <svg
    {...props}
    width={24}
    height={24}
    xmlns="http://www.w3.org/2000/svg"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="M23 11.5a1.5 1.5 0 0 1-1.5 1.5h-20a1.5 1.5 0 0 1 0-3h20a1.5 1.5 0 0 1 1.5 1.5Z"
      fill="currentColor"
    />
  </svg>
);

export default SvgSubtract;
