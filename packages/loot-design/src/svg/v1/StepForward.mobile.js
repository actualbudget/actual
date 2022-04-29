import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgStepForward = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M13 5h3v10h-3V5zM4 5l9 5-9 5V5z" fill="currentColor" />
  </Svg>
);

export default SvgStepForward;
