import * as React from 'react';

const SvgArrowThinDown = props => (
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
      d="m9 16.172-6.071-6.071-1.414 1.414L10 20l.707-.707 7.778-7.778-1.414-1.414L11 16.172V0H9z"
      fill="currentColor"
    />
  </svg>
);

export default SvgArrowThinDown;
