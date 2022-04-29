import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgMinusSolid = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm5-11H5v2h10V9z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgMinusSolid;
