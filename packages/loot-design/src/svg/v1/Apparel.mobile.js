import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgApparel = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M7 0H6L0 3v6l4-1v12h12V8l4 1V3l-6-3h-1a3 3 0 0 1-6 0z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgApparel;
