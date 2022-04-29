import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgAddSolid = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path
      d="M11 9V5H9v4H5v2h4v4h2v-4h4V9h-4zm-1 11a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"
      fill="currentColor"
    />
  </Svg>
);

export default SvgAddSolid;
