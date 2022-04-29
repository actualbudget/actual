import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgPenTool = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M11 9.27V0l6 11-4 6H7l-4-6L9 0v9.27a2 2 0 1 0 2 0zM6 18h8v2H6v-2z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgPenTool;
