import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgBatteryLow = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M0 6c0-1.1.9-2 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6zm2 0v8h16V6H2zm1 1h4v6H3V7z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgBatteryLow;
