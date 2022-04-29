import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgBorderAll = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M11 11v6h6v-6h-6zm0-2h6V3h-6v6zm-2 2H3v6h6v-6zm0-2V3H3v6h6zm-8 9V1h18v18H1v-1z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgBorderAll;
