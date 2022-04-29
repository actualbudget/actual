import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgLocationHotel = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M2 12h18v6h-2v-2H2v2H0V2h2v10zm8-6h8a2 2 0 0 1 2 2v3H10V6zm-4 5a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgLocationHotel;
