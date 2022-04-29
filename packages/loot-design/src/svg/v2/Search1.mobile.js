import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgSearch1 = props => (
  <Svg
    {...props}
    viewBox="0 0 24 24"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M23.414 20.591l-4.645-4.645a10.256 10.256 0 1 0-2.828 2.829l4.645 4.644a2.025 2.025 0 0 0 2.828 0 2 2 0 0 0 0-2.828zM10.25 3.005A7.25 7.25 0 1 1 3 10.255a7.258 7.258 0 0 1 7.25-7.25z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgSearch1;
