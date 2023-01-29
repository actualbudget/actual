import * as React from 'react';

const SvgCheckAlternative = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="M18.48 6.449a1.249 1.249 0 0 0-1.747.265l-5.924 8.04-3.767-3.014a1.251 1.251 0 0 0-1.563 1.953l4.783 3.826a1.263 1.263 0 0 0 1.787-.235l6.7-9.087a1.25 1.25 0 0 0-.269-1.748Z"
      fill="currentColor"
    />
    <path
      d="M12 0a12 12 0 1 0 12 12A12.013 12.013 0 0 0 12 0Zm0 22a10 10 0 1 1 10-10 10.011 10.011 0 0 1-10 10Z"
      fill="currentColor"
    />
  </svg>
);

export default SvgCheckAlternative;
