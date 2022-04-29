import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgBolt = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M13 8V0L8.11 5.87 3 12h4v8L17 8h-4z" fill="currentColor" />
  </Svg>
);

export default SvgBolt;
