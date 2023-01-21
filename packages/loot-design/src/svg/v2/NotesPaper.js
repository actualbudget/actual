import * as React from 'react';

const SvgNotesPaper = props => (
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
      d="M22 0H2a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h14a1 1 0 0 0 .707-.293l7-7A1 1 0 0 0 24 16V2a2 2 0 0 0-2-2ZM2 2.5a.5.5 0 0 1 .5-.5h19a.5.5 0 0 1 .5.5V15a.5.5 0 0 1-.5.5h-4a2 2 0 0 0-2 2v4a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5Z"
      fill="currentColor"
    />
  </svg>
);

export default SvgNotesPaper;
