import * as React from 'react';

const SvgArrowButtonDown1 = props => (
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
      d="M12 13.584a2.643 2.643 0 0 1-1.875-.775L.584 3.268a1.768 1.768 0 0 1 2.5-2.5l8.739 8.739a.25.25 0 0 0 .354 0L20.916.768a1.768 1.768 0 0 1 2.5 2.5l-9.541 9.541a2.643 2.643 0 0 1-1.875.775Z"
      fill="currentColor"
    />
    <path
      d="M12 23.75a2.643 2.643 0 0 1-1.875-.775L.584 13.434a1.768 1.768 0 0 1 2.5-2.5l8.739 8.739a.25.25 0 0 0 .354 0l8.739-8.739a1.768 1.768 0 0 1 2.5 2.5l-9.541 9.541A2.643 2.643 0 0 1 12 23.75Z"
      fill="currentColor"
    />
  </svg>
);

export default SvgArrowButtonDown1;
