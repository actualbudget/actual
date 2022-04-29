import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgStarFull = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgStarFull;
