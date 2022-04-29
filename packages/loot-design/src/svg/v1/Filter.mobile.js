import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgFilter = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M12 12l8-8V0H0v4l8 8v8l4-4v-4z" fill="currentColor" />
  </Svg>
);

export default SvgFilter;
