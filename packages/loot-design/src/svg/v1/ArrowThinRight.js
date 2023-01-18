import * as React from 'react';

const SvgArrowThinRight = props => (
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
      d="m16.172 9-6.071-6.071 1.414-1.414L20 10l-.707.707-7.778 7.778-1.414-1.414L16.172 11H0V9z"
      fill="currentColor"
    />
  </svg>
);

export default SvgArrowThinRight;
