import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgChartPie = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M19.95 11A10 10 0 1 1 9 .05V11h10.95zm-.08-2.6H11.6V.13a10 10 0 0 1 8.27 8.27z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgChartPie;
