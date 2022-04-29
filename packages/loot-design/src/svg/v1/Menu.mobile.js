import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgMenu = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" fill="currentColor" />
  </Svg>
);

export default SvgMenu;
