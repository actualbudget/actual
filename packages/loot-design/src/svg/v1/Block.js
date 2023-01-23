import * as React from 'react';

const SvgBlock = props => (
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
      d="M0 10a10 10 0 1 1 20 0 10 10 0 0 1-20 0zm16.32-4.9L5.09 16.31A8 8 0 0 0 16.32 5.09zm-1.41-1.42A8 8 0 0 0 3.68 14.91L14.91 3.68z"
      fill="currentColor"
    />
  </svg>
);

export default SvgBlock;
