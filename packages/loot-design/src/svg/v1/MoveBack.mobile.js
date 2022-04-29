import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgMoveBack = props => (
  <Svg
    {...props}
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M5.418 16.414a1 1 0 0 0 1.707-.707v-3.291a.25.25 0 0 1 .25-.25h13.542a.25.25 0 0 1 .25.25v5.208a1.25 1.25 0 0 0 2.5 0v-6.708a1.25 1.25 0 0 0-1.25-1.25H7.375a.25.25 0 0 1-.25-.25V6.124a1 1 0 0 0-1.707-.707L.626 10.209a1 1 0 0 0 0 1.414z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgMoveBack;
