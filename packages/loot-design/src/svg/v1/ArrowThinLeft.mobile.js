import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgArrowThinLeft = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M3.828 9l6.071-6.071-1.414-1.414L0 10l.707.707 7.778 7.778 1.414-1.414L3.828 11H20V9H3.828z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgArrowThinLeft;
