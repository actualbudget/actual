import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgArrowUp = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M9 3.828L2.929 9.899 1.515 8.485 10 0l.707.707 7.778 7.778-1.414 1.414L11 3.828V20H9V3.828z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgArrowUp;
