import * as React from 'react';

const SvgNavigationMenu = props => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <rect
      x={0.5}
      y={2.5}
      width={23}
      height={3}
      rx={1}
      ry={1}
      fill="currentColor"
    />
    <rect
      x={0.5}
      y={10.5}
      width={23}
      height={3}
      rx={1}
      ry={1}
      fill="currentColor"
    />
    <rect
      x={0.5}
      y={18.5}
      width={23}
      height={3}
      rx={1}
      ry={1}
      fill="currentColor"
    />
  </svg>
);

export default SvgNavigationMenu;
