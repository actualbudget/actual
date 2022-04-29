import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgReload = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M14.66 15.66A8 8 0 1 1 17 10h-2a6 6 0 1 0-1.76 4.24l1.42 1.42zM12 10h8l-4 4-4-4z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgReload;
