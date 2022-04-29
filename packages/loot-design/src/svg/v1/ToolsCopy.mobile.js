import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgToolsCopy = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M10 0s8 7.58 8 12a8 8 0 1 1-16 0c0-1.5.91-3.35 2.12-5.15A3 3 0 0 0 10 6V0zM8 0a3 3 0 1 0 0 6V0z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgToolsCopy;
