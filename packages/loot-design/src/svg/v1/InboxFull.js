import * as React from 'react';

const SvgInboxFull = props => (
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
      d="M14 14h4V2H2v12h4c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2zM0 2C0 .9.9 0 2 0h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm4 2h12v2H4V4zm0 3h12v2H4V7zm0 3h12v2H4v-2z"
      fill="currentColor"
    />
  </svg>
);

export default SvgInboxFull;
