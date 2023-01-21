import * as React from 'react';

const SvgKey = props => (
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
      d="M23.113 5.954 21.849 4.69l.881-.88a1.914 1.914 0 1 0-2.707-2.71L9.04 12.085a6.014 6.014 0 1 0 2.707 2.707l3.739-3.737.762.762a1.75 1.75 0 1 0 2.475-2.475l-.763-.762 1.416-1.417 1.264 1.263a1.788 1.788 0 0 0 2.473 0 1.751 1.751 0 0 0 0-2.472Zm-16.737 8.5a3 3 0 1 1-3 3 3 3 0 0 1 3-2.998Z"
      fill="currentColor"
    />
  </svg>
);

export default SvgKey;
