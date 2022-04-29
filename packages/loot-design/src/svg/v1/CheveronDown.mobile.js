import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgCheveronDown = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgCheveronDown;
