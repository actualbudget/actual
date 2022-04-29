import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgVolumeMute = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M9 7H5v6h4l5 5V2L9 7z" fill="currentColor" />
  </Svg>
);

export default SvgVolumeMute;
