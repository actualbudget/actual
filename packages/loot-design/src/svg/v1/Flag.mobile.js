import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgFlag = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M7.667 12H2v8H0V0h12l.333 2H20l-3 6 3 6H8l-.333-2z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgFlag;
