import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgArrowOutlineRight = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M20 10a10 10 0 1 1-20 0 10 10 0 0 1 20 0zm-2 0a8 8 0 1 0-16 0 8 8 0 0 0 16 0zm-8 2H5V8h5V5l5 5-5 5v-3z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgArrowOutlineRight;
