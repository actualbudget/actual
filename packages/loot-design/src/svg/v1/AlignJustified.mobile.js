import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgAlignJustified = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M1 1h18v2H1V1zm0 8h18v2H1V9zm0 8h18v2H1v-2zM1 5h18v2H1V5zm0 8h18v2H1v-2z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgAlignJustified;
