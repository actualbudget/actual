import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgTextDecoration = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M12 5h-2v12H8V3h8v2h-2v12h-2V5zM8 3a4 4 0 1 0 0 8V3z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgTextDecoration;
