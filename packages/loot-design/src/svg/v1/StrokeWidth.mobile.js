import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgStrokeWidth = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M0 0h20v5H0V0zm0 7h20v4H0V7zm0 6h20v3H0v-3zm0 5h20v2H0v-2z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgStrokeWidth;
