import React from 'react';

const SvgCalendar = props => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="M21.5 3h-2.75a.25.25 0 0 1-.25-.25V1a1 1 0 0 0-2 0v4.75a.75.75 0 0 1-.75.75.75.75 0 0 1-.75-.75V3.5a.5.5 0 0 0-.5-.5H8.25A.25.25 0 0 1 8 2.751V1a1 1 0 1 0-2 0v4.75a.75.75 0 0 1-.75.75.75.75 0 0 1-.75-.75V3.5A.5.5 0 0 0 4 3H2.5a2 2 0 0 0-2 2v17a2 2 0 0 0 2 2h19a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM21 22H3a.5.5 0 0 1-.5-.5v-12A.5.5 0 0 1 3 9h18a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5z"
      fill="currentColor"
    />
  </svg>
);

export default SvgCalendar;
