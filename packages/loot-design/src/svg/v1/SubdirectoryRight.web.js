import React from 'react';

const SvgSubdirectoryRight = props => (
  <svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M3.5 13H12v5l6-6-6-6v5H4V2H2v11z" fill="currentColor" />
  </svg>
);

export default SvgSubdirectoryRight;
