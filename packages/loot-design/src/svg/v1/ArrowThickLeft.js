import * as React from 'react';

const SvgArrowThickLeft = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M10 13h8V7h-8V2l-8 8 8 8v-5z" fill="currentColor" />
  </svg>
);

export default SvgArrowThickLeft;
