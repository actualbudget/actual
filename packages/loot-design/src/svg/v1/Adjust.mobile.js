import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgAdjust = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M10 2v16a8 8 0 1 0 0-16zm0 18a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgAdjust;
