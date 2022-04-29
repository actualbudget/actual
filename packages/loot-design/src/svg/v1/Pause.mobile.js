import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgPause = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" fill="currentColor" />
  </Svg>
);

export default SvgPause;
