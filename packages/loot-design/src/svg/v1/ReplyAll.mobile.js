import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgReplyAll = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M18 17v-2.99A4 4 0 0 0 14 10h-3v5L5 9l6-6v5h3a6 6 0 0 1 6 6v3h-2zM6 6V3L0 9l6 6v-3L3 9l3-3z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgReplyAll;
