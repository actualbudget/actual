import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgArrowRight = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M16.172 9l-6.071-6.071 1.414-1.414L20 10l-.707.707-7.778 7.778-1.414-1.414L16.172 11H0V9z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgArrowRight;
