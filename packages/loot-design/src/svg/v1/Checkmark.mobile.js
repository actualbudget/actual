import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgCheckmark = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M0 11l2-2 5 5L18 3l2 2L7 18z" fill="currentColor" />
  </Svg>
);

export default SvgCheckmark;
