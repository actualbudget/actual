import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgFormatUnderline = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M16 9A6 6 0 1 1 4 9V1h3v8a3 3 0 0 0 6 0V1h3v8zM2 17h16v2H2v-2z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgFormatUnderline;
