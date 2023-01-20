import * as React from 'react';

const SvgBorderNone = props => (
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
      d="M1 1h2v2H1V1zm0 4h2v2H1V5zm0 4h2v2H1V9zm0 4h2v2H1v-2zm0 4h2v2H1v-2zM5 1h2v2H5V1zm0 8h2v2H5V9zm0 8h2v2H5v-2zM9 1h2v2H9V1zm0 4h2v2H9V5zm0 4h2v2H9V9zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V1zm0 8h2v2h-2V9zm0 8h2v2h-2v-2zm4-16h2v2h-2V1zm0 4h2v2h-2V5zm0 4h2v2h-2V9zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"
      fill="currentColor"
    />
  </svg>
);

export default SvgBorderNone;
