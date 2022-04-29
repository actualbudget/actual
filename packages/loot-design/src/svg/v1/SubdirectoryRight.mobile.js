import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgSubdirectoryRight = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M3.5 13H12v5l6-6-6-6v5H4V2H2v11z" fill="currentColor" />
  </Svg>
);

export default SvgSubdirectoryRight;
