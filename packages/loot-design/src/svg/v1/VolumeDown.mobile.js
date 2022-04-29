import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgVolumeDown = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M7 7H3v6h4l5 5V2L7 7zm8.54 6.54l-1.42-1.42a3 3 0 0 0 0-4.24l1.42-1.42a4.98 4.98 0 0 1 0 7.08z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgVolumeDown;
