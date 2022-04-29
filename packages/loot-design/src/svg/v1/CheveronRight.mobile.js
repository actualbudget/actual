import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgCheveronRight = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M12.95 10.707l.707-.707L8 4.343 6.586 5.757 10.828 10l-4.242 4.243L8 15.657l4.95-4.95z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgCheveronRight;
