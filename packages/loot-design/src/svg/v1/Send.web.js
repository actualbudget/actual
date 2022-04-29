import React from 'react';

const SvgSend = props => (
  <svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M0 0l20 10L0 20V0zm0 8v4l10-2L0 8z" fill="currentColor" />
  </svg>
);

export default SvgSend;
