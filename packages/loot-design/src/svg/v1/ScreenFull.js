import * as React from 'react';

const SvgScreenFull = props => (
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
      d="M2.8 15.8 0 13v7h7l-2.8-2.8 4.34-4.32-1.42-1.42L2.8 15.8zM17.2 4.2 20 7V0h-7l2.8 2.8-4.34 4.32 1.42 1.42L17.2 4.2zm-1.4 13L13 20h7v-7l-2.8 2.8-4.32-4.34-1.42 1.42 4.33 4.33zM4.2 2.8 7 0H0v7l2.8-2.8 4.32 4.34 1.42-1.42L4.2 2.8z"
      fill="currentColor"
    />
  </svg>
);

export default SvgScreenFull;
