import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SvgBookmarkCopy2 = props => (
  <Svg
    {...props}
    viewBox="0 0 20 20"
    style={{
      color: '#242134',
      ...props.style
    }}
  >
    <Path d="M18 12v1H8v5l-6-6 6-6v5h8V2h2z" fill="currentColor" />
  </Svg>
);

export default SvgBookmarkCopy2;
