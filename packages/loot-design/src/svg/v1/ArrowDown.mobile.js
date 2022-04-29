import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgArrowDown = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M9 16.172l-6.071-6.071-1.414 1.414L10 20l.707-.707 7.778-7.778-1.414-1.414L11 16.172V0H9z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgArrowDown;
