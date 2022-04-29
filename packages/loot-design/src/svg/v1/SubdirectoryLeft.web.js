import React from 'react';

const SvgSubdirectoryLeft = props => (
  <svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M18 12v1H8v5l-6-6 6-6v5h8V2h2z" fill="currentColor" />
  </svg>
);

export default SvgSubdirectoryLeft;
