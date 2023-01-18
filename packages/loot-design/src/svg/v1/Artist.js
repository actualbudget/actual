import * as React from 'react';

const SvgArtist = props => (
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
      d="m15.75 8-3.74-3.75a3.99 3.99 0 0 1 6.82-3.08A4 4 0 0 1 15.75 8zm-13.9 7.3 9.2-9.19 2.83 2.83-9.2 9.2-2.82-2.84zm-1.4 2.83 2.11-2.12 1.42 1.42-2.12 2.12-1.42-1.42zM10 15l2-2v7h-2v-5z"
      fill="currentColor"
    />
  </svg>
);

export default SvgArtist;
