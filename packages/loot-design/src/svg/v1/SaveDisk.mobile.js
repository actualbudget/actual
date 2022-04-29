import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgSaveDisk = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M0 2C0 .9.9 0 2 0h14l4 4v14a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm5 0v6h10V2H5zm6 1h3v4h-3V3z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgSaveDisk;
