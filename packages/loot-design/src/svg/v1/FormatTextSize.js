import * as React from 'react';

const SvgFormatTextSize = props => (
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
      d="M16 9v8h-2V9h-4V7h10v2h-4zM8 5v12H6V5H0V3h15v2H8z"
      fill="currentColor"
    />
  </svg>
);

export default SvgFormatTextSize;
