import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgIndentDecrease = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M1 1h18v2H1V1zm6 8h12v2H7V9zm-6 8h18v2H1v-2zM7 5h12v2H7V5zm0 8h12v2H7v-2zM5 6v8l-4-4 4-4z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgIndentDecrease;
