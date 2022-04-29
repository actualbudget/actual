import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgArrowThickDown = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M7 10V2h6v8h5l-8 8-8-8h5z" fill="currentColor" />
  </Svg>
);

export default SvgArrowThickDown;
