import * as React from 'react';

const SvgSubtract = props => (
  <svg
    {...props}
    viewBox="0 0 23 3"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="M23 1.5A1.5 1.5 0 0 1 21.5 3h-20a1.5 1.5 0 0 1 0-3h20A1.5 1.5 0 0 1 23 1.5z"
      fillRule="nonzero"
      fill="currentColor"
    />
  </svg>
);

export default SvgSubtract;
