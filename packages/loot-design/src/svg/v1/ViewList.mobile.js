import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgViewList = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M0 3h20v2H0V3zm0 4h20v2H0V7zm0 4h20v2H0v-2zm0 4h20v2H0v-2z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgViewList;
