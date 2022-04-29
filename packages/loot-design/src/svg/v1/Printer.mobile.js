import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgPrinter = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M4 16H0V6h20v10h-4v4H4v-4zm2-4v6h8v-6H6zM4 0h12v5H4V0zM2 8v2h2V8H2zm4 0v2h2V8H6z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgPrinter;
