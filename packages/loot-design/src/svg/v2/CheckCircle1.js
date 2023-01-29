import * as React from 'react';

const SvgCheckCircle1 = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="M12 0a12 12 0 1 0 12 12A12.014 12.014 0 0 0 12 0Zm6.927 8.2-6.845 9.289a1.011 1.011 0 0 1-1.43.188l-4.888-3.908a1 1 0 1 1 1.25-1.562l4.076 3.261 6.227-8.451a1 1 0 1 1 1.61 1.183Z"
      fill="currentColor"
    />
  </svg>
);

export default SvgCheckCircle1;
