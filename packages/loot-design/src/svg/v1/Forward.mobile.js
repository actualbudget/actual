import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgForward = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M1 5l9 5-9 5V5zm9 0l9 5-9 5V5z" fill="currentColor" />
  </Svg>
);

export default SvgForward;
