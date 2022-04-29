import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgCheveronLeft = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M7.05 9.293L6.343 10 12 15.657l1.414-1.414L9.172 10l4.242-4.243L12 4.343z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgCheveronLeft;
