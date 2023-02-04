import * as React from 'react';

const SvgEditPencil = props => (
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
      d="m12.3 3.7 4 4L4 20H0v-4L12.3 3.7zm1.4-1.4L16 0l4 4-2.3 2.3-4-4z"
      fill="currentColor"
    />
  </svg>
);

export default SvgEditPencil;
