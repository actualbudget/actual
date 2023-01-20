import * as React from 'react';

const SvgDocument = props => (
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
      d="M4 18h12V6h-4V2H4v16zm-2 1V0h12l4 4v16H2v-1z"
      fill="currentColor"
    />
  </svg>
);

export default SvgDocument;
