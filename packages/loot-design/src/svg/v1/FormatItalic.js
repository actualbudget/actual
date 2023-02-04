import * as React from 'react';

const SvgFormatItalic = props => (
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
      d="M8 1h9v2H8V1zm3 2h3L8 17H5l6-14zM2 17h9v2H2v-2z"
      fill="currentColor"
    />
  </svg>
);

export default SvgFormatItalic;
