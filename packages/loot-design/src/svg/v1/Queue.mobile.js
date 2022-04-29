import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgQueue = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M0 2h20v4H0V2zm0 8h20v2H0v-2zm0 6h20v2H0v-2z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgQueue;
