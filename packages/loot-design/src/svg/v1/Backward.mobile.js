import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgBackward = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M19 5v10l-9-5 9-5zm-9 0v10l-9-5 9-5z" fill="currentColor" />
  </Svg>
);

export default SvgBackward;
