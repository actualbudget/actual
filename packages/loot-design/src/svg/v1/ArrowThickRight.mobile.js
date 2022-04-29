import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgArrowThickRight = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M10 7H2v6h8v5l8-8-8-8v5z" fill="currentColor" />
  </Svg>
);

export default SvgArrowThickRight;
