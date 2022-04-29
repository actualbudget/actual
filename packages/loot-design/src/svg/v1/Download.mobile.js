import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgDownload = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M13 8V2H7v6H2l8 8 8-8h-5zM0 18h20v2H0v-2z" fill="currentColor" />
  </Svg>
);

export default SvgDownload;
