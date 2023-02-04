import * as React from 'react';

const SvgBackward = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M19 5v10l-9-5 9-5zm-9 0v10l-9-5 9-5z" fill="currentColor" />
  </svg>
);

export default SvgBackward;
