import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgLocationMarina = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M8 1.88V0h2v16h10l-4 4H2l-2-4h8v-2H0v-.26A24.03 24.03 0 0 0 8 1.88zM19.97 14H10v-.36A11.94 11.94 0 0 0 10 .36v-.2A16.01 16.01 0 0 1 19.97 14z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgLocationMarina;
