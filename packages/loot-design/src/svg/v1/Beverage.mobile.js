import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgBeverage = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M9 18v-7L0 2V0h20v2l-9 9v7l5 1v1H4v-1l5-1zm2-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgBeverage;
