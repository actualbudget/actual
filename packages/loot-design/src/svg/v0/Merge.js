import * as React from 'react';

const SvgMerge = props => (
  <svg
    {...props}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="M24 29h5.333M8 29H2.667M16 21l-8 8M16 21l8 8M16 2.667v18.666M16 2.667 8 9.333M16 2.667l8 6.666"
      stroke="#000"
      strokeWidth={3.5}
      strokeMiterlimit={10}
      strokeLinecap="round"
      fill="currentColor"
    />
  </svg>
);

export default SvgMerge;
