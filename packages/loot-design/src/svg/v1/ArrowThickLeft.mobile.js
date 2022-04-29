import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgArrowThickLeft = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M10 13h8V7h-8V2l-8 8 8 8v-5z" fill="currentColor" />
  </Svg>
);

export default SvgArrowThickLeft;
