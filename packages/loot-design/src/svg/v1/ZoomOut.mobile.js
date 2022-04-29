import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgZoomOut = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      fillRule="evenodd"
      d="M12.9 14.32a8 8 0 1 1 1.41-1.41l5.35 5.33-1.42 1.42-5.33-5.34zM8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM5 7h6v2H5V7z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgZoomOut;
