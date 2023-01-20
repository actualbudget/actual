import * as React from 'react';

const SvgRemoveAlternate = props => (
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
      d="M17.666 6.333a1.249 1.249 0 0 0-1.768 0l-3.722 3.722a.25.25 0 0 1-.353 0L8.1 6.333A1.25 1.25 0 1 0 6.333 8.1l3.722 3.722a.25.25 0 0 1 0 .354L6.333 15.9a1.251 1.251 0 0 0 0 1.768 1.269 1.269 0 0 0 1.768 0l3.722-3.722a.249.249 0 0 1 .353 0l3.724 3.72a1.272 1.272 0 0 0 1.768 0 1.251 1.251 0 0 0 0-1.768l-3.722-3.722a.25.25 0 0 1 0-.354l3.72-3.722a1.249 1.249 0 0 0 0-1.767Z"
      fill="currentColor"
    />
    <path
      d="M12 0a12 12 0 1 0 12 12A12.013 12.013 0 0 0 12 0Zm0 22a10 10 0 1 1 10-10 10.011 10.011 0 0 1-10 10Z"
      fill="currentColor"
    />
  </svg>
);

export default SvgRemoveAlternate;
