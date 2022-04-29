import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgThermometer = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M9 11.17V7h2v4.17a3 3 0 1 1-2 0zm-1-.63a4 4 0 1 0 4 0V4a2 2 0 1 0-4 0v6.53zM6 9.53V4a4 4 0 0 1 8 0v5.53A5.99 5.99 0 0 1 10 20 6 6 0 0 1 6 9.53z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgThermometer;
