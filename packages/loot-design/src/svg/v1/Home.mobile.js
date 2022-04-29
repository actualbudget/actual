import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgHome = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M8 20H3V10H0L10 0l10 10h-3v10h-5v-6H8v6z" fill="currentColor" />
  </Svg>
);

export default SvgHome;
