import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgFactory = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M10.5 20H0V7l5 3.33V7l5 3.33V7l5 3.33V0h5v20h-9.5z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgFactory;
