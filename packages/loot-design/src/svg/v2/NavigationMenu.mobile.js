import React from 'react';
import Svg, { Rect } from 'react-native-svg';

const SvgNavigationMenu = props => (
  <Svg
    {...props}
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Rect
      x={0.5}
      y={2.5}
      width={23}
      height={3}
      rx={1}
      ry={1}
      fill="currentColor"
    />
    <Rect
      x={0.5}
      y={10.5}
      width={23}
      height={3}
      rx={1}
      ry={1}
      fill="currentColor"
    />
    <Rect
      x={0.5}
      y={18.5}
      width={23}
      height={3}
      rx={1}
      ry={1}
      fill="currentColor"
    />
  </Svg>
);

export default SvgNavigationMenu;
