import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgSend = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M0 0l20 10L0 20V0zm0 8v4l10-2L0 8z" fill="currentColor" />
  </Svg>
);

export default SvgSend;
