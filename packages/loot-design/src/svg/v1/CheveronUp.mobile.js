import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgCheveronUp = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M10.707 7.05L10 6.343 4.343 12l1.414 1.414L10 9.172l4.243 4.242L15.657 12z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgCheveronUp;
