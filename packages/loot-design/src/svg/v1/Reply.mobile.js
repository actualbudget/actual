import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgReply = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M15 17v-2.99A4 4 0 0 0 11 10H8v5L2 9l6-6v5h3a6 6 0 0 1 6 6v3h-2z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgReply;
