import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgPlay = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M4 4l12 6-12 6z" fill="currentColor" />
  </Svg>
);

export default SvgPlay;
