import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgMouse = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M4 9V6A6 6 0 0 1 9 .08V9H4zm0 2v3a6 6 0 1 0 12 0v-3H4zm12-2V6a6 6 0 0 0-5-5.92V9h5z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgMouse;
