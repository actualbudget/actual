import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgLocationCurrent = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M0 0l20 8-8 4-2 8z" fill="currentColor" />
  </Svg>
);

export default SvgLocationCurrent;
