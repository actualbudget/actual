import * as React from 'react';

const SvgFilter2 = props => (
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
      d="M23.894.552A1 1 0 0 0 23 0H1a1 1 0 0 0-.8 1.6L9 13.423V22a2.015 2.015 0 0 0 2 2 1.993 1.993 0 0 0 1.2-.4l2-1.5a2.007 2.007 0 0 0 .8-1.6v-7.077L23.8 1.6a1 1 0 0 0 .094-1.048ZM5.417 2.2l3.939 5.25a.5.5 0 0 1 .1.3V9a.5.5 0 0 1-.9.3L3.62 2.8a.5.5 0 0 1 .4-.8h1a.5.5 0 0 1 .397.2Z"
      fill="currentColor"
    />
  </svg>
);

export default SvgFilter2;
