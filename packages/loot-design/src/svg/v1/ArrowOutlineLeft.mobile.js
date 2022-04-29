import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgArrowOutlineLeft = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M0 10a10 10 0 1 1 20 0 10 10 0 0 1-20 0zm2 0a8 8 0 1 0 16 0 8 8 0 0 0-16 0zm8-2h5v4h-5v3l-5-5 5-5v3z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgArrowOutlineLeft;
