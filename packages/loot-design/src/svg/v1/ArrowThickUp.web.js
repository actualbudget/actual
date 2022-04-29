import React from 'react';

const SvgArrowThickUp = props => (
  <svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path d="M7 10v8h6v-8h5l-8-8-8 8h5z" fill="currentColor" />
  </svg>
);

export default SvgArrowThickUp;
