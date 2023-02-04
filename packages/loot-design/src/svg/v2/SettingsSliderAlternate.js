import * as React from 'react';

const SvgSettingsSliderAlternate = props => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <path
      d="M4.5 17.5h6.646a3.5 3.5 0 0 0 6.708 0H19.5a1 1 0 0 0 0-2h-1.646a3.5 3.5 0 0 0-6.708 0H4.5a1 1 0 0 0 0 2Zm10-2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM19.5 6.5h-6.646a3.5 3.5 0 0 0-6.708 0H4.5a1 1 0 0 0 0 2h1.646a3.5 3.5 0 0 0 6.708 0H19.5a1 1 0 1 0 0-2ZM9.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
      fill="currentColor"
    />
  </svg>
);

export default SvgSettingsSliderAlternate;
