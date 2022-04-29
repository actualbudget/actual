import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgViewColumn = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M12 4H8v12h4V4zm2 0v12h4V4h-4zM6 4H2v12h4V4zM0 2h20v16H0V2z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgViewColumn;
