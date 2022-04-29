import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgStepBackward = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M4 5h3v10H4V5zm12 0v10l-9-5 9-5z" fill="currentColor" />
  </Svg>
);

export default SvgStepBackward;
