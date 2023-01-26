import * as React from 'react';

const SvgEducation = props => (
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
      d="M3.33 8 10 12l10-6-10-6L0 6h10v2H3.33zM0 8v8l2-2.22V9.2L0 8zm10 12-5-3-2-1.2v-6l7 4.2 7-4.2v6L10 20z"
      fill="currentColor"
    />
  </svg>
);

export default SvgEducation;
