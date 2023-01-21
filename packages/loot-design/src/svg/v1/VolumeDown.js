import * as React from 'react';

const SvgVolumeDown = props => (
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
      d="M7 7H3v6h4l5 5V2L7 7zm8.54 6.54-1.42-1.42a3 3 0 0 0 0-4.24l1.42-1.42a4.98 4.98 0 0 1 0 7.08z"
      fill="currentColor"
    />
  </svg>
);

export default SvgVolumeDown;
