import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgDotsHorizontalDouble = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M10 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgDotsHorizontalDouble;
