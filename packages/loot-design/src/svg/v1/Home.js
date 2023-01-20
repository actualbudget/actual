import * as React from 'react';

const SvgHome = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M8 20H3V10H0L10 0l10 10h-3v10h-5v-6H8v6z" fill="currentColor" />
  </svg>
);

export default SvgHome;
